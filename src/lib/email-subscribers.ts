import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getAppUrl } from '@/lib/app-url';
import { createHash, randomBytes } from 'crypto';

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export type EmailSubscriberStatus = 'subscribed' | 'unsubscribed';

export type EmailSubscriberRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  status: EmailSubscriberStatus;
  source: string | null;
  country: string | null;
  tags: string[] | null;
  email_preferences: Record<string, unknown> | null;
  is_founding_owner: boolean;
  bounce_count: number | null;
  last_bounced_at: string | null;
  suppressed_at: string | null;
  suppression_reason: string | null;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  unsubscribe_token_hash: string | null;
  unsubscribe_token_created_at: string | null;
  unsubscribe_token_rotated_at: string | null;
};

type SubscribeEmailParams = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  userId?: string | null;
  source?: string | null;
  country?: string | null;
  tags?: string[];
  isFoundingOwner?: boolean;
  client?: AdminClient | null;
};

type UpdateTagParams = {
  email: string;
  tag: string;
  client?: AdminClient | null;
};

type UnsubscribeParams = {
  email: string;
  client?: AdminClient | null;
};

type UpdatePreferencesByTokenParams = {
  token: string;
  preferences: Record<string, unknown>;
  client?: AdminClient | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const TOKEN_BYTES = 32;

function getClient(provided?: AdminClient | null) {
  return provided ?? getSupabaseAdminClient();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

function normalizeTags(tags?: string[]) {
  return Array.from(new Set((tags ?? []).map(normalizeTag).filter(Boolean)));
}

function assertValidEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized)) {
    throw new Error('invalid_email');
  }
  return normalized;
}

function getSubscriberSelect() {
  return [
    'id',
    'email',
    'first_name',
    'last_name',
    'user_id',
    'status',
    'source',
    'country',
    'tags',
    'email_preferences',
    'is_founding_owner',
    'bounce_count',
    'last_bounced_at',
    'suppressed_at',
    'suppression_reason',
    'subscribed_at',
    'unsubscribed_at',
    'unsubscribe_token_hash',
    'unsubscribe_token_created_at',
    'unsubscribe_token_rotated_at',
  ].join(', ');
}

async function getSubscriberByEmail(client: AdminClient, email: string) {
  const { data, error } = await client
    .from('email_subscribers')
    .select(getSubscriberSelect())
    .eq('email', email)
    .maybeSingle<EmailSubscriberRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function recordEvent(client: AdminClient, subscriberId: string, eventType: string, metadata?: Record<string, unknown>) {
  const { error } = await client.from('email_events').insert({
    subscriber_id: subscriberId,
    event_type: eventType,
    metadata: metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function generateUnsubscribeToken() {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashUnsubscribeToken(token: string) {
  return createHash('sha256').update(token.trim()).digest('hex');
}

export function buildUnsubscribeUrl(token: string) {
  return getAppUrl(`/unsubscribe/${encodeURIComponent(token)}`, 'unsubscribe link');
}

export async function createOrRotateUnsubscribeToken(subscriberId: string, options?: { client?: AdminClient | null }) {
  const client = getClient(options?.client);
  if (!client) {
    throw new Error('service_role_missing');
  }

  const token = generateUnsubscribeToken();
  const tokenHash = hashUnsubscribeToken(token);
  const nowIso = new Date().toISOString();

  const { error } = await client
    .from('email_subscribers')
    .update({
      unsubscribe_token_hash: tokenHash,
      unsubscribe_token_created_at: nowIso,
      unsubscribe_token_rotated_at: nowIso,
    })
    .eq('id', subscriberId);

  if (error) {
    throw new Error(error.message);
  }

  return { token, tokenHash };
}

export async function getSubscriberByUnsubscribeToken(token: string, options?: { client?: AdminClient | null }) {
  const client = getClient(options?.client);
  if (!client) {
    throw new Error('service_role_missing');
  }

  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return null;
  }

  const { data, error } = await client
    .from('email_subscribers')
    .select(getSubscriberSelect())
    .eq('unsubscribe_token_hash', hashUnsubscribeToken(normalizedToken))
    .maybeSingle<EmailSubscriberRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function subscribeEmail(params: SubscribeEmailParams) {
  const client = getClient(params.client);
  if (!client) {
    throw new Error('service_role_missing');
  }

  const email = assertValidEmail(params.email);
  const firstName = params.firstName?.trim() || null;
  const lastName = params.lastName?.trim() || null;
  const source = params.source?.trim() || null;
  const country = params.country?.trim() || null;
  const nextTags = normalizeTags(params.tags);
  const existing = await getSubscriberByEmail(client, email);

  if (!existing) {
    const { data, error } = await client
      .from('email_subscribers')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        user_id: params.userId ?? null,
        status: 'subscribed',
        source,
        country,
        tags: nextTags,
        email_preferences: { marketing: true },
        is_founding_owner: Boolean(params.isFoundingOwner),
        bounce_count: 0,
        last_bounced_at: null,
        suppressed_at: null,
        suppression_reason: null,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      })
      .select(getSubscriberSelect())
      .single<EmailSubscriberRow>();

    if (error) {
      throw new Error(error.message);
    }

    await createOrRotateUnsubscribeToken(data.id, { client });
    const refreshed = await getSubscriberByEmail(client, email);

    await recordEvent(client, data.id, 'subscribed', {
      source,
      tags: nextTags,
    });

    return refreshed ?? data;
  }

  const mergedTags = Array.from(new Set([...(existing.tags ?? []), ...nextTags])).sort();
  const nextStatus: EmailSubscriberStatus = 'subscribed';
  const subscribedAt = existing.status === 'subscribed' ? existing.subscribed_at : new Date().toISOString();
  const nextPreferences = {
    ...(existing.email_preferences ?? {}),
    marketing: true,
  };

  const { data, error } = await client
    .from('email_subscribers')
    .update({
      first_name: firstName ?? existing.first_name,
      last_name: lastName ?? existing.last_name,
      user_id: params.userId ?? existing.user_id,
      status: nextStatus,
      source: source ?? existing.source,
      country: country ?? existing.country,
      tags: mergedTags,
      email_preferences: nextPreferences,
      is_founding_owner: Boolean(params.isFoundingOwner) || existing.is_founding_owner,
      suppressed_at: null,
      suppression_reason: null,
      subscribed_at: subscribedAt,
      unsubscribed_at: null,
    })
    .eq('id', existing.id)
    .select(getSubscriberSelect())
    .single<EmailSubscriberRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!existing.unsubscribe_token_hash || existing.status === 'unsubscribed') {
    await createOrRotateUnsubscribeToken(existing.id, { client });
    const refreshed = await getSubscriberByEmail(client, email);
    if (refreshed) {
      await recordEvent(client, data.id, existing.status === 'subscribed' ? 'subscription_updated' : 'resubscribed', {
        source: source ?? existing.source,
        tags: mergedTags,
      });

      return refreshed;
    }
  }

  await recordEvent(client, data.id, existing.status === 'subscribed' ? 'subscription_updated' : 'resubscribed', {
    source: source ?? existing.source,
    tags: mergedTags,
  });

  return data;
}

export async function unsubscribeEmail(params: UnsubscribeParams) {
  const client = getClient(params.client);
  if (!client) {
    throw new Error('service_role_missing');
  }

  const email = assertValidEmail(params.email);
  const existing = await getSubscriberByEmail(client, email);
  if (!existing) {
    return null;
  }

  const unsubscribedAt = new Date().toISOString();
  const { data, error } = await client
    .from('email_subscribers')
    .update({
      status: 'unsubscribed',
      email_preferences: {
        ...(existing.email_preferences ?? {}),
        marketing: false,
      },
      unsubscribed_at: unsubscribedAt,
    })
    .eq('id', existing.id)
    .select(getSubscriberSelect())
    .single<EmailSubscriberRow>();

  if (error) {
    throw new Error(error.message);
  }

  await recordEvent(client, existing.id, 'unsubscribed');

  return data;
}

export async function addSubscriberTag(params: UpdateTagParams) {
  const client = getClient(params.client);
  if (!client) {
    throw new Error('service_role_missing');
  }

  const email = assertValidEmail(params.email);
  const tag = normalizeTag(params.tag);
  if (!tag) {
    throw new Error('invalid_tag');
  }

  const existing = await getSubscriberByEmail(client, email);
  if (!existing) {
    throw new Error('subscriber_not_found');
  }

  const nextTags = Array.from(new Set([...(existing.tags ?? []), tag])).sort();
  const { data, error } = await client
    .from('email_subscribers')
    .update({ tags: nextTags })
    .eq('id', existing.id)
    .select(getSubscriberSelect())
    .single<EmailSubscriberRow>();

  if (error) {
    throw new Error(error.message);
  }

  await recordEvent(client, existing.id, 'tag_added', { tag });

  return data;
}

export async function removeSubscriberTag(params: UpdateTagParams) {
  const client = getClient(params.client);
  if (!client) {
    throw new Error('service_role_missing');
  }

  const email = assertValidEmail(params.email);
  const tag = normalizeTag(params.tag);
  if (!tag) {
    throw new Error('invalid_tag');
  }

  const existing = await getSubscriberByEmail(client, email);
  if (!existing) {
    throw new Error('subscriber_not_found');
  }

  const nextTags = (existing.tags ?? []).filter((value) => normalizeTag(value) !== tag);
  const { data, error } = await client
    .from('email_subscribers')
    .update({ tags: nextTags })
    .eq('id', existing.id)
    .select(getSubscriberSelect())
    .single<EmailSubscriberRow>();

  if (error) {
    throw new Error(error.message);
  }

  await recordEvent(client, existing.id, 'tag_removed', { tag });

  return data;
}

export async function unsubscribeByToken(token: string, options?: { client?: AdminClient | null }) {
  const client = getClient(options?.client);
  if (!client) {
    throw new Error('service_role_missing');
  }

  const subscriber = await getSubscriberByUnsubscribeToken(token, { client });
  if (!subscriber) {
    return { ok: false as const, reason: 'invalid_token' as const, subscriber: null };
  }

  if (subscriber.status === 'unsubscribed') {
    return { ok: true as const, reason: 'already_unsubscribed' as const, subscriber };
  }

  const unsubscribedAt = new Date().toISOString();
  const nextPreferences = {
    ...(subscriber.email_preferences ?? {}),
    marketing: false,
  };

  const { data, error } = await client
    .from('email_subscribers')
    .update({
      status: 'unsubscribed',
      unsubscribed_at: unsubscribedAt,
      email_preferences: nextPreferences,
    })
    .eq('id', subscriber.id)
    .select(getSubscriberSelect())
    .single<EmailSubscriberRow>();

  if (error) {
    throw new Error(error.message);
  }

  await recordEvent(client, subscriber.id, 'unsubscribed', {
    source: 'unsubscribe_page',
  });

  return { ok: true as const, reason: 'unsubscribed' as const, subscriber: data };
}

export async function updateSubscriberPreferencesByToken(params: UpdatePreferencesByTokenParams) {
  const client = getClient(params.client);
  if (!client) {
    throw new Error('service_role_missing');
  }

  const subscriber = await getSubscriberByUnsubscribeToken(params.token, { client });
  if (!subscriber) {
    return { ok: false as const, reason: 'invalid_token' as const, subscriber: null };
  }

  const nextPreferences = {
    ...(subscriber.email_preferences ?? {}),
    ...params.preferences,
  };
  const marketingEnabled = Boolean(nextPreferences.marketing);

  const { data, error } = await client
    .from('email_subscribers')
    .update({
      email_preferences: nextPreferences,
      status: marketingEnabled ? 'subscribed' : 'unsubscribed',
      unsubscribed_at: marketingEnabled ? null : new Date().toISOString(),
    })
    .eq('id', subscriber.id)
    .select(getSubscriberSelect())
    .single<EmailSubscriberRow>();

  if (error) {
    throw new Error(error.message);
  }

  await recordEvent(client, subscriber.id, 'preferences_updated', {
    source: 'unsubscribe_page',
    preferences: nextPreferences,
  });

  return { ok: true as const, reason: 'preferences_updated' as const, subscriber: data };
}

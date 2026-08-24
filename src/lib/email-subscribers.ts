import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getAppUrl } from '@/lib/app-url';
import { hasFoundingOwnerGrant } from '@/lib/founding-owner-bonus';
import { createHash, randomBytes } from 'crypto';

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;
type SubscriberEventMetadata = Record<string, unknown>;

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
  last_email_sent_at: string | null;
  last_opened_at: string | null;
  last_clicked_at: string | null;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  welcome_sequence_started_at: string | null;
  welcome_sequence_completed_at: string | null;
  welcome_sequence_step: number | null;
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

export type IngestSubscriberParams = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  userId?: string | null;
  source?: string | null;
  country?: string | null;
  tags?: string[];
  isFoundingOwner?: boolean;
  emailPreferences?: Record<string, unknown> | null;
  explicitConsent?: boolean;
  metadata?: SubscriberEventMetadata | null;
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

type SuppressMarketingParams = {
  email: string;
  reason: string;
  client?: AdminClient | null;
};

type UpdatePreferencesByTokenParams = {
  token: string;
  preferences: Record<string, unknown>;
  client?: AdminClient | null;
};

type OwnerLookupRow = {
  id: string;
  user_id: string | null;
  verification: string | null;
  founding_owner_bonus_cents_per_point?: number | null;
  founding_owner_bonus_started_at?: string | null;
  founding_owner_bonus_expires_at?: string | null;
  founding_owner_granted_at?: string | null;
  founding_owner_promotion_id?: string | null;
};

type ProfileLookupRow = {
  id: string;
  email: string | null;
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
    'last_email_sent_at',
    'last_opened_at',
    'last_clicked_at',
    'subscribed_at',
    'unsubscribed_at',
    'welcome_sequence_started_at',
    'welcome_sequence_completed_at',
    'welcome_sequence_step',
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

async function recordEvent(client: AdminClient, subscriberId: string, eventType: string, metadata?: SubscriberEventMetadata) {
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

function buildIngestionEventMetadata({
  source,
  tags,
  explicitConsent,
  ownerTraits,
  metadata,
}: {
  source: string | null;
  tags: string[];
  explicitConsent: boolean;
  ownerTraits?: {
    matchedOwner: boolean;
    isFoundingOwner: boolean;
    isVerifiedOwner: boolean;
  };
  metadata?: SubscriberEventMetadata | null;
}) {
  return {
    source,
    tags,
    explicit_consent: explicitConsent,
    owner_matched: ownerTraits?.matchedOwner ?? false,
    founding_owner_detected: ownerTraits?.isFoundingOwner ?? false,
    verified_owner_detected: ownerTraits?.isVerifiedOwner ?? false,
    ...(metadata ?? {}),
  };
}

async function getOwnerByUserId(client: AdminClient, userId: string) {
  const { data, error } = await client
    .from('owners')
    .select(
      'id, user_id, verification, founding_owner_bonus_cents_per_point, founding_owner_bonus_started_at, founding_owner_bonus_expires_at, founding_owner_granted_at, founding_owner_promotion_id',
    )
    .or(`id.eq.${userId},user_id.eq.${userId}`)
    .maybeSingle<OwnerLookupRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getProfileByEmail(client: AdminClient, email: string) {
  const { data, error } = await client
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle<ProfileLookupRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function resolveOwnerSubscriberTraits(client: AdminClient, params: {
  email: string;
  userId?: string | null;
}) {
  const normalizedEmail = normalizeEmail(params.email);

  let owner =
    (params.userId ? await getOwnerByUserId(client, params.userId) : null) ??
    null;

  if (!owner) {
    const profile = await getProfileByEmail(client, normalizedEmail);
    if (profile?.id) {
      owner = await getOwnerByUserId(client, profile.id);
    }
  }

  const isFoundingOwner = hasFoundingOwnerGrant(owner);
  const isVerifiedOwner = owner?.verification === 'verified';

  return {
    matchedOwner: Boolean(owner),
    isFoundingOwner,
    isVerifiedOwner,
    ownerUserId: owner?.user_id ?? null,
  };
}

export async function ingestSubscriber(params: IngestSubscriberParams) {
  const client = getClient(params.client);
  if (!client) {
    throw new Error('service_role_missing');
  }

  const email = assertValidEmail(params.email);
  const firstName = params.firstName?.trim() || null;
  const lastName = params.lastName?.trim() || null;
  const source = params.source?.trim() || null;
  const country = params.country?.trim() || null;
  const ownerTraits = await resolveOwnerSubscriberTraits(client, {
    email,
    userId: params.userId ?? null,
  });
  const ownerTags = ownerTraits.isFoundingOwner
    ? normalizeTags([
        'founding_owner',
        'owner_lead',
        ...(ownerTraits.isVerifiedOwner ? ['verified_owner'] : []),
      ])
    : [];
  const nextTags = normalizeTags([...(params.tags ?? []), ...ownerTags]);
  const explicitConsent = Boolean(params.explicitConsent);
  const existing = await getSubscriberByEmail(client, email);
  const requestedPreferences = {
    ...(params.emailPreferences ?? {}),
  };
  const eventMetadata = buildIngestionEventMetadata({
    source,
    tags: nextTags,
    explicitConsent,
    ownerTraits,
    metadata: params.metadata,
  });

  if (!existing) {
    const nowIso = new Date().toISOString();
    const marketingEnabled = explicitConsent && Boolean(requestedPreferences.marketing ?? true);

    const { data, error } = await client
      .from('email_subscribers')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        user_id: params.userId ?? ownerTraits.ownerUserId ?? null,
        status: marketingEnabled ? 'subscribed' : 'unsubscribed',
        source,
        country,
        tags: nextTags,
        email_preferences: {
          ...requestedPreferences,
          marketing: marketingEnabled,
        },
        is_founding_owner: Boolean(params.isFoundingOwner) || ownerTraits.isFoundingOwner,
        bounce_count: 0,
        last_bounced_at: null,
        suppressed_at: null,
        suppression_reason: null,
        subscribed_at: nowIso,
        unsubscribed_at: marketingEnabled ? null : nowIso,
      })
      .select(getSubscriberSelect())
      .single<EmailSubscriberRow>();

    if (error) {
      throw new Error(error.message);
    }

    await createOrRotateUnsubscribeToken(data.id, { client });
    const refreshed = await getSubscriberByEmail(client, email);

    await recordEvent(client, data.id, marketingEnabled ? 'subscribed' : 'subscriber_ingested', eventMetadata);

    return refreshed ?? data;
  }

  const mergedTags = Array.from(new Set([...(existing.tags ?? []), ...nextTags])).sort();
  const marketingEnabled = explicitConsent
    ? Boolean(requestedPreferences.marketing ?? true)
    : Boolean(existing.email_preferences?.marketing ?? existing.status === 'subscribed');
  const nextPreferences = explicitConsent
    ? {
        ...(existing.email_preferences ?? {}),
        ...requestedPreferences,
        marketing: marketingEnabled,
      }
    : {
        ...(existing.email_preferences ?? {}),
        ...requestedPreferences,
        marketing: existing.email_preferences?.marketing ?? existing.status === 'subscribed',
      };
  const nextStatus: EmailSubscriberStatus =
    existing.status === 'unsubscribed' && explicitConsent ? 'subscribed' : existing.status;
  const subscribedAt =
    existing.subscribed_at ?? (nextStatus === 'subscribed' ? new Date().toISOString() : existing.subscribed_at);
  const unsubscribedAt =
    nextStatus === 'subscribed'
      ? null
      : existing.unsubscribed_at ?? (existing.status === 'unsubscribed' ? new Date().toISOString() : null);

  const { data, error } = await client
    .from('email_subscribers')
    .update({
      first_name: firstName ?? existing.first_name,
      last_name: lastName ?? existing.last_name,
      user_id: params.userId ?? ownerTraits.ownerUserId ?? existing.user_id,
      status: nextStatus,
      source: source ?? existing.source,
      country: country ?? existing.country,
      tags: mergedTags,
      email_preferences: nextPreferences,
      is_founding_owner: Boolean(params.isFoundingOwner) || ownerTraits.isFoundingOwner || existing.is_founding_owner,
      suppressed_at: explicitConsent ? null : existing.suppressed_at,
      suppression_reason: explicitConsent ? null : existing.suppression_reason,
      subscribed_at: subscribedAt,
      unsubscribed_at: unsubscribedAt,
    })
    .eq('id', existing.id)
    .select(getSubscriberSelect())
    .single<EmailSubscriberRow>();

  if (error) {
    throw new Error(error.message);
  }

  const shouldRotateToken = !existing.unsubscribe_token_hash || (existing.status === 'unsubscribed' && nextStatus === 'subscribed');
  if (shouldRotateToken) {
    await createOrRotateUnsubscribeToken(existing.id, { client });
  }

  const refreshed = shouldRotateToken ? await getSubscriberByEmail(client, email) : null;
  const subscriber = refreshed ?? data;
  const eventType =
    existing.status === 'unsubscribed' && nextStatus === 'subscribed'
      ? 'resubscribed'
      : nextStatus === 'subscribed'
        ? 'subscription_updated'
        : 'subscriber_ingested';

  await recordEvent(client, subscriber.id, eventType, {
    ...eventMetadata,
    tags: mergedTags,
  });

  return subscriber;
}

export async function subscribeEmail(params: SubscribeEmailParams) {
  return ingestSubscriber({
    email: params.email,
    firstName: params.firstName,
    lastName: params.lastName,
    userId: params.userId,
    source: params.source,
    country: params.country,
    tags: params.tags,
    isFoundingOwner: params.isFoundingOwner,
    emailPreferences: { marketing: true },
    explicitConsent: true,
    client: params.client,
  });
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

export async function suppressSubscriberMarketing(params: SuppressMarketingParams) {
  const client = getClient(params.client);
  if (!client) {
    throw new Error('service_role_missing');
  }

  const email = assertValidEmail(params.email);
  const existing = await getSubscriberByEmail(client, email);
  if (!existing) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from('email_subscribers')
    .update({
      status: 'unsubscribed',
      email_preferences: {
        ...(existing.email_preferences ?? {}),
        marketing: false,
      },
      suppressed_at: existing.suppressed_at ?? nowIso,
      suppression_reason: params.reason,
      unsubscribed_at: existing.unsubscribed_at ?? nowIso,
    })
    .eq('id', existing.id)
    .select(getSubscriberSelect())
    .single<EmailSubscriberRow>();

  if (error) {
    throw new Error(error.message);
  }

  await recordEvent(client, existing.id, 'marketing_suppressed', {
    reason: params.reason,
  });

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

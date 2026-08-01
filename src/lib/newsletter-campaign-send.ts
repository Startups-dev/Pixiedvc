import { sendPlainEmail } from '@/lib/email';
import { createOrRotateUnsubscribeToken, buildUnsubscribeUrl } from '@/lib/email-subscribers';
import { renderNewsletterCampaign, type NewsletterCampaignContent } from '@/lib/newsletter-campaign-renderer';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

type CampaignRow = {
  id: string;
  name: string | null;
  subject: string;
  preview_text: string | null;
  content_json: NewsletterCampaignContent | null;
  segment_slug: string | null;
  status: string;
};

type SubscriberRow = {
  id: string;
  email: string;
  status: string;
  tags: string[] | null;
  suppressed_at: string | null;
  email_preferences: Record<string, unknown> | null;
  is_founding_owner: boolean;
};

type CampaignSubscriberRow = {
  subscriber_id: string;
  sent_at: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const TAG_AUDIENCE_ALIASES = {
  ready_stay_alerts: 'ready_stay_alerts',
  guest_lead: 'guest_lead',
  guest_leads: 'guest_lead',
  owner_lead: 'owner_lead',
  owner_leads: 'owner_lead',
  verified_owner: 'verified_owner',
  verified_owners: 'verified_owner',
  liquidation_lead: 'liquidation_lead',
  liquidation_leads: 'liquidation_lead',
} as const;

export type NewsletterCampaignSendResult = {
  ok: boolean;
  campaignId: string;
  status: 'sent' | 'failed';
  audienceCount: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: Array<{ subscriberId?: string; message: string }>;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hasValidEmail(email: string) {
  return EMAIL_RE.test(normalizeEmail(email));
}

function hasMarketingConsent(subscriber: SubscriberRow) {
  return Boolean(subscriber.email_preferences?.marketing ?? subscriber.status === 'subscribed');
}

function normalizeAudienceSlug(slug?: string | null) {
  const normalized = slug?.trim().toLowerCase() ?? '';
  if (!normalized) return null;
  if (normalized === 'newsletter_subscribers') return normalized;
  if (normalized === 'founding_owners' || normalized === 'founding_owner') return 'founding_owners';
  return TAG_AUDIENCE_ALIASES[normalized as keyof typeof TAG_AUDIENCE_ALIASES] ?? null;
}

function buildPreviewFallbackUnsubscribeUrl() {
  return buildUnsubscribeUrl('preview-token') ?? 'https://hannadvc.com/unsubscribe/preview-token';
}

async function buildUnsubscribeUrlForSubscriber(client: AdminClient, subscriberId: string) {
  const token = await createOrRotateUnsubscribeToken(subscriberId, { client });
  return buildUnsubscribeUrl(token.token) ?? buildPreviewFallbackUnsubscribeUrl();
}

export async function resolveNewsletterCampaignAudience(params: {
  client?: AdminClient | null;
  segmentSlug?: string | null;
}) {
  const client = params.client ?? getSupabaseAdminClient();
  if (!client) {
    throw new Error('service_role_missing');
  }

  const audience = normalizeAudienceSlug(params.segmentSlug);
  if (!audience) {
    throw new Error('invalid_segment_slug');
  }

  let query = client
    .from('email_subscribers')
    .select('id, email, status, tags, suppressed_at, email_preferences, is_founding_owner')
    .eq('status', 'subscribed')
    .is('suppressed_at', null)
    .limit(10000);

  if (audience === 'newsletter_subscribers') {
    query = query.contains('tags', ['newsletter_subscriber']);
  } else if (audience === 'founding_owners') {
    query = query.eq('is_founding_owner', true);
  } else {
    query = query.contains('tags', [audience]);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as SubscriberRow[]).filter(
    (subscriber) => hasMarketingConsent(subscriber) && hasValidEmail(subscriber.email),
  );

  return rows;
}

export async function sendNewsletterCampaignNow(params: {
  campaignId: string;
  requestedByEmail?: string | null;
  client?: AdminClient | null;
}) {
  const client = params.client ?? getSupabaseAdminClient();
  if (!client) {
    throw new Error('service_role_missing');
  }

  const campaignId = params.campaignId.trim();
  if (!campaignId) {
    throw new Error('campaign_id_missing');
  }

  const { data: campaign, error } = await client
    .from('email_campaigns')
    .select('id, name, subject, preview_text, content_json, segment_slug, status')
    .eq('id', campaignId)
    .maybeSingle<CampaignRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!campaign) {
    throw new Error('campaign_not_found');
  }

  if (!(campaign.status === 'draft' || campaign.status === 'scheduled')) {
    throw new Error('campaign_not_sendable');
  }

  const { data: lockedCampaign, error: lockError } = await client
    .from('email_campaigns')
    .update({ status: 'sending', sent_at: null })
    .eq('id', campaign.id)
    .eq('status', campaign.status)
    .select('id')
    .maybeSingle<{ id: string }>();

  if (lockError) {
    throw new Error(lockError.message);
  }

  if (!lockedCampaign?.id) {
    throw new Error('campaign_send_locked');
  }

  const audience = await resolveNewsletterCampaignAudience({
    client,
    segmentSlug: campaign.segment_slug,
  });

  if (audience.length > 0) {
    const { error: snapshotError } = await client.from('email_campaign_subscribers').upsert(
      audience.map((subscriber) => ({
        campaign_id: campaign.id,
        subscriber_id: subscriber.id,
      })),
      { onConflict: 'campaign_id,subscriber_id' },
    );

    if (snapshotError) {
      throw new Error(snapshotError.message);
    }
  }

  const { data: existingRows, error: existingRowsError } = await client
    .from('email_campaign_subscribers')
    .select('subscriber_id, sent_at')
    .eq('campaign_id', campaign.id);

  if (existingRowsError) {
    throw new Error(existingRowsError.message);
  }

  const sentMap = new Map(
    ((existingRows ?? []) as CampaignSubscriberRow[]).map((row) => [row.subscriber_id, row.sent_at]),
  );

  const errors: Array<{ subscriberId?: string; message: string }> = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const subscriber of audience) {
    if (sentMap.get(subscriber.id)) {
      skipped += 1;
      continue;
    }

    try {
      const unsubscribeUrl = await buildUnsubscribeUrlForSubscriber(client, subscriber.id);
      const rendered = renderNewsletterCampaign({
        subject: campaign.subject,
        previewText: campaign.preview_text,
        contentJson: campaign.content_json,
        unsubscribeUrl,
      });

      const sendResult = await sendPlainEmail({
        to: normalizeEmail(subscriber.email),
        subject: campaign.subject,
        body: rendered.text,
        html: rendered.html,
        context: `newsletter campaign ${campaign.id}`,
        templateKey: 'newsletter_campaign',
        relatedEntityType: 'email_campaign',
        relatedEntityId: campaign.id,
        metadata: {
          campaign_id: campaign.id,
          campaign_name: campaign.name ?? campaign.subject,
          segment_slug: campaign.segment_slug ?? null,
          subscriber_id: subscriber.id,
        },
      });

      if (sendResult.status !== 'sent') {
        failed += 1;
        errors.push({ subscriberId: subscriber.id, message: 'send_failed' });
        continue;
      }

      const nowIso = new Date().toISOString();
      const { error: sentAtError } = await client
        .from('email_campaign_subscribers')
        .update({ sent_at: nowIso })
        .eq('campaign_id', campaign.id)
        .eq('subscriber_id', subscriber.id);

      if (sentAtError) {
        throw new Error(sentAtError.message);
      }

      const { error: subscriberUpdateError } = await client
        .from('email_subscribers')
        .update({ last_email_sent_at: nowIso })
        .eq('id', subscriber.id);

      if (subscriberUpdateError) {
        throw new Error(subscriberUpdateError.message);
      }

      const { error: eventError } = await client.from('email_events').insert({
        subscriber_id: subscriber.id,
        event_type: 'newsletter_campaign_sent',
        metadata: {
          campaign_id: campaign.id,
          campaign_name: campaign.name ?? campaign.subject,
          segment_slug: campaign.segment_slug ?? null,
        },
      });

      if (eventError) {
        throw new Error(eventError.message);
      }

      sent += 1;
    } catch (error) {
      failed += 1;
      errors.push({
        subscriberId: subscriber.id,
        message: error instanceof Error ? error.message : 'unknown_send_error',
      });
    }
  }

  const sentAt = new Date().toISOString();
  const { error: finalizeError } = await client
    .from('email_campaigns')
    .update({ status: 'sent', sent_at: sentAt })
    .eq('id', campaign.id);

  if (finalizeError) {
    throw new Error(finalizeError.message);
  }

  return {
    ok: failed === 0,
    campaignId: campaign.id,
    status: failed === audience.length && audience.length > 0 ? 'failed' : 'sent',
    audienceCount: audience.length,
    sent,
    skipped,
    failed,
    errors,
  } satisfies NewsletterCampaignSendResult;
}

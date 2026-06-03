import { getAppUrl } from '@/lib/app-url';
import { buildUnsubscribeUrl, createOrRotateUnsubscribeToken } from '@/lib/email-subscribers';
import { sendWelcomeSequenceEmail } from '@/lib/email';
import { buildWelcomeSequenceTemplate, type WelcomeSequenceStep } from '@/lib/email/templates/welcome-sequence';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getWelcomeSequenceAssetUrls } from '@/lib/welcome-sequence-assets';

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

const DAY_MS = 24 * 60 * 60 * 1000;
const AUTOMATION_KEY = 'welcome_sequence';
const SEGMENT_SLUG = 'guest_leads';
const STEPS: Array<{
  step: WelcomeSequenceStep;
  templateKey: string;
}> = [
  { step: 0, templateKey: 'welcome_sequence_day_0' },
  { step: 3, templateKey: 'welcome_sequence_day_3' },
  { step: 7, templateKey: 'welcome_sequence_day_7' },
  { step: 14, templateKey: 'welcome_sequence_day_14' },
  { step: 21, templateKey: 'welcome_sequence_day_21' },
  { step: 30, templateKey: 'welcome_sequence_day_30' },
];

type SubscriberRow = {
  id: string;
  email: string;
  first_name: string | null;
  status: 'subscribed' | 'unsubscribed' | string;
  tags: string[] | null;
  suppressed_at: string | null;
  subscribed_at: string | null;
  welcome_sequence_started_at: string | null;
  welcome_sequence_completed_at: string | null;
  welcome_sequence_step: number | null;
  email_preferences: Record<string, unknown> | null;
};

type CampaignRow = {
  id: string;
  subject: string;
};

type ExistingSendRow = {
  related_entity_id: string | null;
  template_key: string;
};

export type WelcomeSequenceResult = {
  ok: boolean;
  now: string;
  candidates: number;
  sent: number;
  skipped: Array<{ subscriberId: string; reason: string }>;
  errors: Array<{ subscriberId?: string; message: string }>;
};

function parseIso(value: string | null | undefined) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function hasMarketingConsent(subscriber: SubscriberRow) {
  return Boolean(subscriber.email_preferences?.marketing ?? subscriber.status === 'subscribed');
}

function resolveCurrentStep(step: number | null | undefined) {
  return typeof step === 'number' && Number.isFinite(step) ? step : null;
}

function findDueStep(subscriber: SubscriberRow, now: Date) {
  if (subscriber.status !== 'subscribed') return null;
  if (subscriber.suppressed_at) return null;
  if (!hasMarketingConsent(subscriber)) return null;
  if (!(subscriber.tags ?? []).includes('newsletter_subscriber')) return null;
  if (subscriber.welcome_sequence_completed_at) return null;

  const startedAtMs = parseIso(subscriber.welcome_sequence_started_at ?? subscriber.subscribed_at);
  if (startedAtMs === null) return null;

  const elapsedDays = Math.floor((now.getTime() - startedAtMs) / DAY_MS);
  const currentStep = resolveCurrentStep(subscriber.welcome_sequence_step);

  for (const definition of [...STEPS].reverse()) {
    if (elapsedDays < definition.step) continue;
    if (currentStep !== null && currentStep >= definition.step) continue;
    return definition;
  }

  return null;
}

async function ensureCampaign(
  client: AdminClient,
  step: WelcomeSequenceStep,
) {
  const template = buildWelcomeSequenceTemplate(step, {});
  const { data, error } = await client
    .from('email_campaigns')
    .select('id, subject')
    .eq('subject', template.subject)
    .eq('segment_slug', SEGMENT_SLUG)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const existing = ((data ?? []) as CampaignRow[])[0] ?? null;
  if (existing) {
    return existing;
  }

  const { data: inserted, error: insertError } = await client
    .from('email_campaigns')
    .insert({
      subject: template.subject,
      preview_text: template.previewText,
      body_html: template.html,
      status: 'scheduled',
      segment_slug: SEGMENT_SLUG,
    })
    .select('id, subject')
    .single<CampaignRow>();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return inserted;
}

async function loadSentMap(client: AdminClient, subscriberIds: string[]) {
  const templateKeys = STEPS.map((step) => step.templateKey);
  const { data, error } = await client
    .from('outbound_emails')
    .select('related_entity_id, template_key')
    .eq('related_entity_type', 'email_subscriber')
    .in('related_entity_id', subscriberIds)
    .in('template_key', templateKeys)
    .eq('status', 'sent');

  if (error) {
    throw new Error(error.message);
  }

  const sent = new Set<string>();
  for (const row of (data ?? []) as ExistingSendRow[]) {
    if (!row.related_entity_id) continue;
    sent.add(`${row.related_entity_id}:${row.template_key}`);
  }
  return sent;
}

function buildTemplateUrls() {
  return {
    browseUrl: getAppUrl('/', 'PixieDVC home'),
    readyStaysUrl: getAppUrl('/ready-stays', 'Ready Stays page'),
    resortsUrl: getAppUrl('/resorts', 'Resorts page'),
    requestStayUrl: getAppUrl('/check-dates', 'Request your stay page'),
    lastMinuteUrl: getAppUrl('/last-minute-deals', 'Last-minute deals page'),
    howItWorksUrl: getAppUrl('/how-it-works', 'How it works page'),
    ...getWelcomeSequenceAssetUrls(),
  };
}

export async function runWelcomeSequence(params?: {
  client?: AdminClient | null;
  now?: Date;
  dryRun?: boolean;
}) {
  const client = params?.client ?? getSupabaseAdminClient();
  const now = params?.now ?? new Date();

  if (!client) {
    return {
      ok: false,
      now: now.toISOString(),
      candidates: 0,
      sent: 0,
      skipped: [],
      errors: [{ message: 'service_role_missing' }],
    } satisfies WelcomeSequenceResult;
  }

  const { data: subscribers, error } = await client
    .from('email_subscribers')
    .select(
      'id, email, first_name, status, tags, suppressed_at, subscribed_at, welcome_sequence_started_at, welcome_sequence_completed_at, welcome_sequence_step, email_preferences',
    )
    .eq('status', 'subscribed')
    .contains('tags', ['newsletter_subscriber'])
    .order('subscribed_at', { ascending: true })
    .limit(200);

  if (error) {
    return {
      ok: false,
      now: now.toISOString(),
      candidates: 0,
      sent: 0,
      skipped: [],
      errors: [{ message: error.message }],
    } satisfies WelcomeSequenceResult;
  }

  const rows = (subscribers ?? []) as SubscriberRow[];
  const dueSubscribers = rows
    .map((subscriber) => ({
      subscriber,
      dueStep: findDueStep(subscriber, now),
    }))
    .filter((entry): entry is { subscriber: SubscriberRow; dueStep: (typeof STEPS)[number] } => Boolean(entry.dueStep));

  const skipped: Array<{ subscriberId: string; reason: string }> = [];
  const errors: Array<{ subscriberId?: string; message: string }> = [];
  let sent = 0;

  if (dueSubscribers.length === 0) {
    return {
      ok: true,
      now: now.toISOString(),
      candidates: 0,
      sent: 0,
      skipped,
      errors,
    } satisfies WelcomeSequenceResult;
  }

  const subscriberIds = dueSubscribers.map((entry) => entry.subscriber.id);
  const sentMap = await loadSentMap(client, subscriberIds);
  const campaignMap = new Map<WelcomeSequenceStep, CampaignRow>();
  for (const definition of STEPS) {
    campaignMap.set(definition.step, await ensureCampaign(client, definition.step));
  }

  const templateUrls = buildTemplateUrls();

  for (const entry of dueSubscribers) {
    const { subscriber, dueStep } = entry;
    const sentKey = `${subscriber.id}:${dueStep.templateKey}`;
    if (sentMap.has(sentKey)) {
      skipped.push({ subscriberId: subscriber.id, reason: 'already_sent' });
      continue;
    }

    const campaign = campaignMap.get(dueStep.step);
    if (!campaign) {
      errors.push({ subscriberId: subscriber.id, message: 'campaign_missing' });
      continue;
    }

    if (params?.dryRun) {
      sent += 1;
      continue;
    }

    try {
      await client.from('email_campaign_subscribers').upsert({
        campaign_id: campaign.id,
        subscriber_id: subscriber.id,
      });

      const unsubscribeToken = await createOrRotateUnsubscribeToken(subscriber.id, { client });

      const sendResult = await sendWelcomeSequenceEmail({
        to: subscriber.email,
        firstName: subscriber.first_name,
        step: dueStep.step,
        ...templateUrls,
        unsubscribeUrl: buildUnsubscribeUrl(unsubscribeToken.token),
        templateKey: dueStep.templateKey,
        relatedEntityType: 'email_subscriber',
        relatedEntityId: subscriber.id,
        metadata: {
          subscriberId: subscriber.id,
          campaignId: campaign.id,
          welcomeSequenceStep: dueStep.step,
        },
      });

      if (sendResult.status !== 'sent') {
        errors.push({ subscriberId: subscriber.id, message: `send_failed_${dueStep.step}` });
        continue;
      }

      const nowIso = now.toISOString();
      const updatePayload: Record<string, unknown> = {
        welcome_sequence_step: dueStep.step,
        welcome_sequence_started_at: subscriber.welcome_sequence_started_at ?? nowIso,
        last_email_sent_at: nowIso,
      };
      if (dueStep.step === 30) {
        updatePayload.welcome_sequence_completed_at = nowIso;
      }

      const { error: updateError } = await client
        .from('email_subscribers')
        .update(updatePayload)
        .eq('id', subscriber.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: campaignSubscriberError } = await client
        .from('email_campaign_subscribers')
        .update({ sent_at: nowIso })
        .eq('campaign_id', campaign.id)
        .eq('subscriber_id', subscriber.id);

      if (campaignSubscriberError) {
        throw new Error(campaignSubscriberError.message);
      }

      const { error: eventError } = await client.from('email_events').insert({
        subscriber_id: subscriber.id,
        event_type: 'welcome_sequence_sent',
        metadata: {
          step: dueStep.step,
          campaign_id: campaign.id,
          template_key: dueStep.templateKey,
        },
      });

      if (eventError) {
        throw new Error(eventError.message);
      }

      sent += 1;
    } catch (sendError) {
      errors.push({
        subscriberId: subscriber.id,
        message: sendError instanceof Error ? sendError.message : 'unknown_send_error',
      });
    }
  }

  return {
    ok: errors.length === 0,
    now: now.toISOString(),
    candidates: dueSubscribers.length,
    sent,
    skipped,
    errors,
  } satisfies WelcomeSequenceResult;
}

export { AUTOMATION_KEY as WELCOME_SEQUENCE_AUTOMATION_KEY };

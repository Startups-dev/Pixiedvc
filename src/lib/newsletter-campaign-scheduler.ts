import { getSupabaseAdminClient } from '@/lib/supabase-admin';

import { sendNewsletterCampaignNow } from '@/lib/newsletter-campaign-send';

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export const NEWSLETTER_CAMPAIGNS_AUTOMATION_KEY = 'newsletter_campaigns';

type ScheduledCampaignRow = {
  id: string;
  status: string;
  scheduled_at: string | null;
};

export type ScheduledNewsletterCampaignsResult = {
  ok: boolean;
  now: string;
  campaignsProcessed: number;
  candidates: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: Array<{ campaignId?: string; message: string }>;
};

export async function runScheduledNewsletterCampaigns(params?: {
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
      campaignsProcessed: 0,
      candidates: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [{ message: 'service_role_missing' }],
    } satisfies ScheduledNewsletterCampaignsResult;
  }

  const { data, error } = await client
    .from('email_campaigns')
    .select('id, status, scheduled_at')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(100);

  if (error) {
    return {
      ok: false,
      now: now.toISOString(),
      campaignsProcessed: 0,
      candidates: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [{ message: error.message }],
    } satisfies ScheduledNewsletterCampaignsResult;
  }

  const campaigns = (data ?? []) as ScheduledCampaignRow[];
  const errors: Array<{ campaignId?: string; message: string }> = [];
  let campaignsProcessed = 0;
  let candidates = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const campaign of campaigns) {
    campaignsProcessed += 1;

    if (params?.dryRun) {
      continue;
    }

    try {
      const result = await sendNewsletterCampaignNow({
        campaignId: campaign.id,
        requestedByEmail: 'newsletter-cron',
        client,
      });

      candidates += result.audienceCount;
      sent += result.sent;
      skipped += result.skipped;
      failed += result.failed;

      for (const sendError of result.errors) {
        errors.push({
          campaignId: campaign.id,
          message: sendError.message,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_send_error';
      if (message === 'campaign_send_locked' || message === 'campaign_not_sendable') {
        skipped += 1;
      } else {
        failed += 1;
        errors.push({
          campaignId: campaign.id,
          message,
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    now: now.toISOString(),
    campaignsProcessed,
    candidates,
    sent,
    skipped,
    failed,
    errors,
  } satisfies ScheduledNewsletterCampaignsResult;
}

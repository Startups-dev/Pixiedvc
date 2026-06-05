import { sendPlainEmail } from '@/lib/email';
import { buildUnsubscribeUrl, createOrRotateUnsubscribeToken } from '@/lib/email-subscribers';
import { renderNewsletterCampaign, type NewsletterCampaignContent } from '@/lib/newsletter-campaign-renderer';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

type CampaignRow = {
  id: string;
  subject: string;
  preview_text: string | null;
  content_json: NewsletterCampaignContent | null;
  status: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function assertValidEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized)) {
    throw new Error('invalid_email');
  }
  return normalized;
}

function buildPreviewUnsubscribeUrl() {
  return buildUnsubscribeUrl('preview-token') ?? 'https://pixiedvc.com/unsubscribe/preview-token';
}

async function buildTestUnsubscribeUrl(client: AdminClient, email: string) {
  const { data, error } = await client
    .from('email_subscribers')
    .select('id')
    .eq('email', email)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    return buildPreviewUnsubscribeUrl();
  }

  const token = await createOrRotateUnsubscribeToken(data.id, { client });
  return buildUnsubscribeUrl(token.token) ?? buildPreviewUnsubscribeUrl();
}

export async function sendNewsletterCampaignTestEmail(params: {
  campaignId: string;
  email: string;
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

  const email = assertValidEmail(params.email);

  const { data: campaign, error } = await client
    .from('email_campaigns')
    .select('id, subject, preview_text, content_json, status')
    .eq('id', campaignId)
    .maybeSingle<CampaignRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!campaign) {
    throw new Error('campaign_not_found');
  }

  const unsubscribeUrl = await buildTestUnsubscribeUrl(client, email);
  const rendered = renderNewsletterCampaign({
    subject: campaign.subject,
    previewText: campaign.preview_text,
    contentJson: campaign.content_json,
    unsubscribeUrl,
  });

  const sendResult = await sendPlainEmail({
    to: email,
    subject: campaign.subject,
    body: rendered.text,
    html: rendered.html,
    context: `newsletter campaign test ${campaignId}`,
    templateKey: 'newsletter_campaign_test',
    relatedEntityType: 'email_campaign',
    relatedEntityId: campaign.id,
    metadata: {
      is_test: true,
      campaign_id: campaign.id,
      requested_by_email: params.requestedByEmail ?? null,
      preview_tool: true,
    },
  });

  if (sendResult.status !== 'sent') {
    throw new Error('send_failed');
  }

  return {
    ok: true as const,
    campaignId: campaign.id,
    email,
  };
}

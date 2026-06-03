import { getAppUrl } from '@/lib/app-url';
import { buildUnsubscribeUrl, createOrRotateUnsubscribeToken } from '@/lib/email-subscribers';
import { sendWelcomeSequenceEmail } from '@/lib/email';
import { buildWelcomeSequenceTemplate, type WelcomeSequenceStep } from '@/lib/email/templates/welcome-sequence';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getWelcomeSequenceAssetUrls } from '@/lib/welcome-sequence-assets';

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export const WELCOME_SEQUENCE_PREVIEW_STEPS: Array<{
  step: WelcomeSequenceStep;
  label: string;
  testTemplateKey: string;
}> = [
  { step: 0, label: 'Day 0', testTemplateKey: 'welcome_sequence_day_0_test' },
  { step: 3, label: 'Day 3', testTemplateKey: 'welcome_sequence_day_3_test' },
  { step: 7, label: 'Day 7', testTemplateKey: 'welcome_sequence_day_7_test' },
  { step: 14, label: 'Day 14', testTemplateKey: 'welcome_sequence_day_14_test' },
  { step: 21, label: 'Day 21', testTemplateKey: 'welcome_sequence_day_21_test' },
  { step: 30, label: 'Day 30', testTemplateKey: 'welcome_sequence_day_30_test' },
];

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

function buildTemplateUrls() {
  return {
    browseUrl: getAppUrl('/', 'PixieDVC home') ?? 'https://pixiedvc.com',
    readyStaysUrl: getAppUrl('/ready-stays', 'Ready Stays page') ?? 'https://pixiedvc.com/ready-stays',
    resortsUrl: getAppUrl('/resorts', 'Resorts page') ?? 'https://pixiedvc.com/resorts',
    requestStayUrl: getAppUrl('/check-dates', 'Request your stay page') ?? 'https://pixiedvc.com/check-dates',
    lastMinuteUrl: getAppUrl('/last-minute-deals', 'Last-minute deals page') ?? 'https://pixiedvc.com/last-minute-deals',
    howItWorksUrl: getAppUrl('/how-it-works', 'How it works page') ?? 'https://pixiedvc.com/how-it-works',
    ...getWelcomeSequenceAssetUrls(),
  };
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

export function buildWelcomeSequencePreviewCards() {
  const urls = buildTemplateUrls();
  const unsubscribeUrl = buildPreviewUnsubscribeUrl();

  return WELCOME_SEQUENCE_PREVIEW_STEPS.map(({ step, label, testTemplateKey }) => {
    const template = buildWelcomeSequenceTemplate(step, {
      firstName: 'PixieDVC Insider',
      ...urls,
      unsubscribeUrl,
    });

    return {
      step,
      label,
      testTemplateKey,
      ...template,
    };
  });
}

export async function sendWelcomeSequenceTestEmail(params: {
  email: string;
  step: WelcomeSequenceStep;
  requestedByEmail?: string | null;
  client?: AdminClient | null;
}) {
  const client = params.client ?? getSupabaseAdminClient();
  if (!client) {
    throw new Error('service_role_missing');
  }

  const email = assertValidEmail(params.email);
  const definition = WELCOME_SEQUENCE_PREVIEW_STEPS.find((item) => item.step === params.step);
  if (!definition) {
    throw new Error('invalid_step');
  }

  const unsubscribeUrl = await buildTestUnsubscribeUrl(client, email);
  const sendResult = await sendWelcomeSequenceEmail({
    to: email,
    firstName: 'PixieDVC Insider',
    step: params.step,
    ...buildTemplateUrls(),
    unsubscribeUrl,
    templateKey: definition.testTemplateKey,
    relatedEntityType: 'admin_welcome_sequence_preview',
    relatedEntityId: `welcome-sequence-day-${params.step}`,
    metadata: {
      is_test: true,
      preview_tool: true,
      requested_by_email: params.requestedByEmail ?? null,
      original_template_key: `welcome_sequence_day_${params.step}`,
      welcome_sequence_step: params.step,
    },
  });

  if (sendResult.status !== 'sent') {
    throw new Error('send_failed');
  }

  return {
    ok: true as const,
    step: params.step,
    email,
  };
}

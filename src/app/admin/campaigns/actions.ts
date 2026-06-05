'use server';

import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';

import { requireAdminUser } from '@/lib/admin';
import {
  buildNewsletterCampaignDraftValuesFromFormData,
  buildNewsletterCampaignActionErrorState,
  buildNewsletterCampaignPersistence,
  type NewsletterCampaignEditorState,
  parseNewsletterCampaignFormData,
} from '@/lib/newsletter-campaigns';
import { sendNewsletterCampaignNow } from '@/lib/newsletter-campaign-send';
import { sendNewsletterCampaignTestEmail } from '@/lib/newsletter-campaign-test-send';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

function buildCampaignRedirectUrl(campaignId: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `/admin/campaigns/${campaignId}?${search.toString()}`;
}

export async function createCampaignDraftAction(
  _prevState: NewsletterCampaignEditorState,
  formData: FormData,
): Promise<NewsletterCampaignEditorState> {
  const { user } = await requireAdminUser('/admin/campaigns/new');
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return {
      status: 'error',
      message: 'Missing SUPABASE_SERVICE_ROLE_KEY.',
    };
  }

  const submittedValues = buildNewsletterCampaignDraftValuesFromFormData(formData);
  const parsed = parseNewsletterCampaignFormData(formData);
  if (!parsed.success) {
    return buildNewsletterCampaignActionErrorState(parsed.error, submittedValues);
  }

  const payload = buildNewsletterCampaignPersistence(parsed.data);
  const { data, error } = await admin
    .from('email_campaigns')
    .insert({
      ...payload.insertOrUpdate,
      status: 'draft',
      created_by: user.id,
    })
    .select('id')
    .maybeSingle<{ id: string }>();

  if (error || !data?.id) {
    return {
      status: 'error',
      message: error?.message ?? 'Unable to create the campaign draft.',
      previewHtml: payload.rendered.html,
      previewText: payload.rendered.text,
      values: payload.values,
    };
  }

  revalidatePath('/admin/campaigns');

  return {
    status: 'created',
    message: 'Campaign draft created.',
    campaignId: data.id,
    previewHtml: payload.rendered.html,
    previewText: payload.rendered.text,
  };
}

export async function updateCampaignDraftAction(
  _prevState: NewsletterCampaignEditorState,
  formData: FormData,
): Promise<NewsletterCampaignEditorState> {
  await requireAdminUser('/admin/campaigns');
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return {
      status: 'error',
      message: 'Missing SUPABASE_SERVICE_ROLE_KEY.',
    };
  }

  const campaignId = String(formData.get('campaignId') ?? '').trim();
  if (!campaignId) {
    return {
      status: 'error',
      message: 'Campaign ID missing.',
    };
  }

  const { data: existing, error: existingError } = await admin
    .from('email_campaigns')
    .select('id, status')
    .eq('id', campaignId)
    .maybeSingle<{ id: string; status: string }>();

  if (existingError) {
    return {
      status: 'error',
      message: existingError.message,
    };
  }

  if (!existing) {
    notFound();
  }

  if (!(existing.status === 'draft' || existing.status === 'scheduled')) {
    return {
      status: 'error',
      message: 'Only draft or scheduled campaigns can be edited.',
    };
  }

  const submittedValues = buildNewsletterCampaignDraftValuesFromFormData(formData);
  const parsed = parseNewsletterCampaignFormData(formData);
  if (!parsed.success) {
    return buildNewsletterCampaignActionErrorState(parsed.error, submittedValues);
  }

  const payload = buildNewsletterCampaignPersistence(parsed.data);
  const { error } = await admin
    .from('email_campaigns')
    .update(payload.insertOrUpdate)
    .eq('id', campaignId);

  if (error) {
    return {
      status: 'error',
      message: error.message,
      previewHtml: payload.rendered.html,
      previewText: payload.rendered.text,
      values: payload.values,
    };
  }

  revalidatePath('/admin/campaigns');
  revalidatePath(`/admin/campaigns/${campaignId}`);

  return {
    status: 'saved',
    message: 'Draft saved.',
    campaignId,
    previewHtml: payload.rendered.html,
    previewText: payload.rendered.text,
    values: payload.values,
  };
}

export async function scheduleCampaignAction(formData: FormData) {
  await requireAdminUser('/admin/campaigns');
  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  }

  const campaignId = String(formData.get('campaignId') ?? '').trim();
  const scheduledAtInput = String(formData.get('scheduledAt') ?? '').trim();

  if (!campaignId) {
    redirect(buildCampaignRedirectUrl('missing', { scheduleError: 'Missing campaign.' }));
  }

  if (!scheduledAtInput) {
    redirect(
      buildCampaignRedirectUrl(campaignId, {
        scheduleError: 'Choose a date and time to schedule this campaign.',
      }),
    );
  }

  const scheduledAt = new Date(scheduledAtInput);
  if (Number.isNaN(scheduledAt.getTime())) {
    redirect(buildCampaignRedirectUrl(campaignId, { scheduleError: 'Enter a valid schedule date and time.' }));
  }

  if (scheduledAt.getTime() <= Date.now()) {
    redirect(buildCampaignRedirectUrl(campaignId, { scheduleError: 'Schedule time must be in the future.' }));
  }

  const { data: campaign, error: campaignError } = await admin
    .from('email_campaigns')
    .select('id, status')
    .eq('id', campaignId)
    .maybeSingle<{ id: string; status: string }>();

  if (campaignError) {
    redirect(buildCampaignRedirectUrl(campaignId, { scheduleError: campaignError.message }));
  }

  if (!campaign) {
    redirect(buildCampaignRedirectUrl(campaignId, { scheduleError: 'Campaign not found.' }));
  }

  if (!(campaign.status === 'draft' || campaign.status === 'scheduled')) {
    redirect(
      buildCampaignRedirectUrl(campaignId, {
        scheduleError: 'Only draft or scheduled campaigns can be scheduled.',
      }),
    );
  }

  const { error } = await admin
    .from('email_campaigns')
    .update({
      status: 'scheduled',
      scheduled_at: scheduledAt.toISOString(),
    })
    .eq('id', campaignId);

  if (error) {
    redirect(buildCampaignRedirectUrl(campaignId, { scheduleError: error.message }));
  }

  revalidatePath('/admin/campaigns');
  revalidatePath(`/admin/campaigns/${campaignId}`);

  redirect(buildCampaignRedirectUrl(campaignId, { scheduleSaved: '1' }));
}

export async function unscheduleCampaignAction(formData: FormData) {
  await requireAdminUser('/admin/campaigns');
  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  }

  const campaignId = String(formData.get('campaignId') ?? '').trim();
  if (!campaignId) {
    redirect(buildCampaignRedirectUrl('missing', { scheduleError: 'Missing campaign.' }));
  }

  const { data: campaign, error: campaignError } = await admin
    .from('email_campaigns')
    .select('id, status')
    .eq('id', campaignId)
    .maybeSingle<{ id: string; status: string }>();

  if (campaignError) {
    redirect(buildCampaignRedirectUrl(campaignId, { scheduleError: campaignError.message }));
  }

  if (!campaign) {
    redirect(buildCampaignRedirectUrl(campaignId, { scheduleError: 'Campaign not found.' }));
  }

  if (campaign.status !== 'scheduled') {
    redirect(buildCampaignRedirectUrl(campaignId, { scheduleError: 'Only scheduled campaigns can be unscheduled.' }));
  }

  const { error } = await admin
    .from('email_campaigns')
    .update({
      status: 'draft',
      scheduled_at: null,
    })
    .eq('id', campaignId)
    .eq('status', 'scheduled');

  if (error) {
    redirect(buildCampaignRedirectUrl(campaignId, { scheduleError: error.message }));
  }

  revalidatePath('/admin/campaigns');
  revalidatePath(`/admin/campaigns/${campaignId}`);

  redirect(buildCampaignRedirectUrl(campaignId, { unscheduled: '1' }));
}

export async function archiveCampaignAction(formData: FormData) {
  await requireAdminUser('/admin/campaigns');
  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  }

  const campaignId = String(formData.get('campaignId') ?? '').trim();
  if (!campaignId) {
    throw new Error('Campaign ID missing.');
  }

  const { error } = await admin
    .from('email_campaigns')
    .update({ status: 'archived' })
    .eq('id', campaignId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/campaigns');
  revalidatePath(`/admin/campaigns/${campaignId}`);
}

export async function sendCampaignTestEmailAction(formData: FormData) {
  const { user } = await requireAdminUser('/admin/campaigns');
  const campaignId = String(formData.get('campaignId') ?? '').trim();
  const email = String(formData.get('testEmail') ?? '').trim();

  if (!campaignId || !email) {
    redirect(
      buildCampaignRedirectUrl(campaignId || 'missing', {
        testError: 'Missing campaign or test email.',
      }),
    );
  }

  try {
    await sendNewsletterCampaignTestEmail({
      campaignId,
      email,
      requestedByEmail: user.email ?? null,
    });

    redirect(
      buildCampaignRedirectUrl(campaignId, {
        testSent: '1',
        testEmail: email,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'invalid_email'
        ? 'Enter a valid test email address.'
        : error instanceof Error && error.message === 'campaign_not_found'
          ? 'Campaign not found.'
          : error instanceof Error && error.message === 'service_role_missing'
            ? 'Missing SUPABASE_SERVICE_ROLE_KEY.'
            : 'Unable to send the test email right now.';

    redirect(
      buildCampaignRedirectUrl(campaignId, {
        testError: message,
        testEmail: email,
      }),
    );
  }
}

export async function sendCampaignNowAction(formData: FormData) {
  const { user } = await requireAdminUser('/admin/campaigns');
  const campaignId = String(formData.get('campaignId') ?? '').trim();
  const confirmation = String(formData.get('sendConfirmation') ?? '').trim();

  if (!campaignId) {
    redirect(
      buildCampaignRedirectUrl('missing', {
        sendError: 'Missing campaign.',
      }),
    );
  }

  if (confirmation !== 'SEND') {
    redirect(
      buildCampaignRedirectUrl(campaignId, {
        sendError: 'Type SEND to confirm campaign delivery.',
      }),
    );
  }

  try {
    const result = await sendNewsletterCampaignNow({
      campaignId,
      requestedByEmail: user.email ?? null,
    });

    redirect(
      buildCampaignRedirectUrl(campaignId, {
        sendNow: '1',
        audienceCount: String(result.audienceCount),
        sentCount: String(result.sent),
        skippedCount: String(result.skipped),
        failedCount: String(result.failed),
        sendStatus: result.status,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'campaign_not_found'
        ? 'Campaign not found.'
        : error instanceof Error && error.message === 'campaign_not_sendable'
          ? 'Only draft or scheduled campaigns can be sent now.'
          : error instanceof Error && error.message === 'campaign_send_locked'
            ? 'This campaign is already being sent or was sent by another request.'
            : error instanceof Error && error.message === 'service_role_missing'
              ? 'Missing SUPABASE_SERVICE_ROLE_KEY.'
              : 'Unable to send the campaign right now.';

    redirect(
      buildCampaignRedirectUrl(campaignId, {
        sendError: message,
      }),
    );
  }
}

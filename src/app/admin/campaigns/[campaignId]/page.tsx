import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Card } from '@pixiedvc/design-system';

import { CampaignEditorForm } from '@/app/admin/campaigns/CampaignEditorForm';
import {
  archiveCampaignAction,
  scheduleCampaignAction,
  sendCampaignNowAction,
  sendCampaignTestEmailAction,
  unscheduleCampaignAction,
  updateCampaignDraftAction,
} from '@/app/admin/campaigns/actions';
import { requireAdminUser } from '@/lib/admin';
import { buildUnsubscribeUrl } from '@/lib/email-subscribers';
import { buildNewsletterCampaignPreview, getAudienceLabel, getNewsletterCampaignEditorValues, type NewsletterCampaignEditorRow } from '@/lib/newsletter-campaigns';
import { resolveNewsletterCampaignAudience } from '@/lib/newsletter-campaign-send';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatDateTimeInputValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireAdminUser('/admin/campaigns');
  const { campaignId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const created = (Array.isArray(resolvedSearchParams.created) ? resolvedSearchParams.created[0] : resolvedSearchParams.created) === '1';
  const testSent = (Array.isArray(resolvedSearchParams.testSent) ? resolvedSearchParams.testSent[0] : resolvedSearchParams.testSent) === '1';
  const testEmail = (Array.isArray(resolvedSearchParams.testEmail) ? resolvedSearchParams.testEmail[0] : resolvedSearchParams.testEmail)?.trim() ?? user.email ?? '';
  const testError = (Array.isArray(resolvedSearchParams.testError) ? resolvedSearchParams.testError[0] : resolvedSearchParams.testError)?.trim() ?? '';
  const sendNow = (Array.isArray(resolvedSearchParams.sendNow) ? resolvedSearchParams.sendNow[0] : resolvedSearchParams.sendNow) === '1';
  const sendStatus = (Array.isArray(resolvedSearchParams.sendStatus) ? resolvedSearchParams.sendStatus[0] : resolvedSearchParams.sendStatus)?.trim() ?? '';
  const sendError = (Array.isArray(resolvedSearchParams.sendError) ? resolvedSearchParams.sendError[0] : resolvedSearchParams.sendError)?.trim() ?? '';
  const scheduleSaved = (Array.isArray(resolvedSearchParams.scheduleSaved) ? resolvedSearchParams.scheduleSaved[0] : resolvedSearchParams.scheduleSaved) === '1';
  const unscheduled = (Array.isArray(resolvedSearchParams.unscheduled) ? resolvedSearchParams.unscheduled[0] : resolvedSearchParams.unscheduled) === '1';
  const scheduleError = (Array.isArray(resolvedSearchParams.scheduleError) ? resolvedSearchParams.scheduleError[0] : resolvedSearchParams.scheduleError)?.trim() ?? '';
  const audienceCount = Number(Array.isArray(resolvedSearchParams.audienceCount) ? resolvedSearchParams.audienceCount[0] : resolvedSearchParams.audienceCount) || 0;
  const sentCount = Number(Array.isArray(resolvedSearchParams.sentCount) ? resolvedSearchParams.sentCount[0] : resolvedSearchParams.sentCount) || 0;
  const skippedCount = Number(Array.isArray(resolvedSearchParams.skippedCount) ? resolvedSearchParams.skippedCount[0] : resolvedSearchParams.skippedCount) || 0;
  const failedCount = Number(Array.isArray(resolvedSearchParams.failedCount) ? resolvedSearchParams.failedCount[0] : resolvedSearchParams.failedCount) || 0;

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-3">
            <Link href="/admin/campaigns" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to campaigns
            </Link>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
              <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
                Campaign Editor
              </h1>
            </div>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Missing service role key. Configure <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </Card>
        </div>
      </div>
    );
  }

  const { data, error } = await admin
    .from('email_campaigns')
    .select('id, name, subject, preview_text, body_text, body_html, content_json, status, segment_slug, created_at, scheduled_at, sent_at')
    .eq('id', campaignId)
    .maybeSingle<NewsletterCampaignEditorRow>();

  if (error) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-3">
            <Link href="/admin/campaigns" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to campaigns
            </Link>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
              <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
                Campaign Editor
              </h1>
            </div>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6">
            <p className="text-sm text-[#ff6b6b]">Unable to load campaign.</p>
            <p className="mt-2 text-xs text-[#8e8ea0]">{error.message}</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    notFound();
  }

  const initialValues = getNewsletterCampaignEditorValues(data);
  const preview = buildNewsletterCampaignPreview(initialValues, buildUnsubscribeUrl('preview-token'));
  const readOnly = !(data.status === 'draft' || data.status === 'scheduled');
  const audienceEstimate = data.status === 'draft' || data.status === 'scheduled'
    ? (await resolveNewsletterCampaignAudience({
        client: admin,
        segmentSlug: data.segment_slug,
      }).catch(() => []))
    : [];
  const scheduledInputValue = formatDateTimeInputValue(data.scheduled_at);

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
        <header className="space-y-3">
          <Link href="/admin/campaigns" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            ← Back to campaigns
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
              <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
                {data.name?.trim() || data.subject}
              </h1>
              <p className="text-sm text-[#b4b4b4]">
                Status: <span className="font-medium text-[#ececec]">{data.status}</span> · Created {formatDateTime(data.created_at)} · Scheduled {formatDateTime(data.scheduled_at)} · Sent {formatDateTime(data.sent_at)}
              </p>
              {created ? <p className="text-sm text-emerald-300">Campaign draft created.</p> : null}
              {readOnly ? <p className="text-sm text-amber-200">This campaign is read only because it is currently {data.status}.</p> : null}
            </div>
            {!readOnly ? (
              <form action={archiveCampaignAction}>
                <input type="hidden" name="campaignId" value={campaignId} />
                <button type="submit" className="rounded-xl border border-rose-500/30 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-200">
                  Archive campaign
                </button>
              </form>
            ) : null}
          </div>
        </header>

        {testSent ? (
          <Card surface="dark" className="border-emerald-500/30 bg-emerald-500/12 p-4 text-sm text-emerald-200">
            Sent test email to <span className="font-semibold">{testEmail}</span>.
          </Card>
        ) : null}

        {testError ? (
          <Card surface="dark" className="border-rose-500/30 bg-rose-500/12 p-4 text-sm text-rose-200">
            {testError}
          </Card>
        ) : null}

        {sendNow ? (
          <Card
            surface="dark"
            className={`p-4 text-sm ${
              failedCount > 0
                ? 'border-amber-500/30 bg-amber-500/12 text-amber-200'
                : 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200'
            }`}
          >
            Campaign send finished with status <span className="font-semibold">{sendStatus || 'sent'}</span>. Audience {audienceCount} · Sent {sentCount} · Skipped {skippedCount} · Failed {failedCount}.
          </Card>
        ) : null}

        {sendError ? (
          <Card surface="dark" className="border-rose-500/30 bg-rose-500/12 p-4 text-sm text-rose-200">
            {sendError}
          </Card>
        ) : null}

        {scheduleSaved ? (
          <Card surface="dark" className="border-emerald-500/30 bg-emerald-500/12 p-4 text-sm text-emerald-200">
            Campaign scheduled. This campaign will automatically send to the selected audience at the scheduled time.
          </Card>
        ) : null}

        {unscheduled ? (
          <Card surface="dark" className="border-emerald-500/30 bg-emerald-500/12 p-4 text-sm text-emerald-200">
            Campaign moved back to draft.
          </Card>
        ) : null}

        {scheduleError ? (
          <Card surface="dark" className="border-rose-500/30 bg-rose-500/12 p-4 text-sm text-rose-200">
            {scheduleError}
          </Card>
        ) : null}

        <Card surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8e8ea0]">Test Send</p>
              <h2 className="text-xl font-semibold text-[#ececec]">Send test email</h2>
              <p className="text-sm text-[#b4b4b4]">
                Uses the currently saved campaign content, logs to <code>outbound_emails</code>, and does not touch audience delivery state.
              </p>
            </div>
            <form action={sendCampaignTestEmailAction} className="w-full max-w-lg space-y-3 rounded-2xl border border-[#3a3a3a] bg-[#252525] p-4">
              <input type="hidden" name="campaignId" value={campaignId} />
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.22em] text-[#8e8ea0]">Test recipient</span>
                <input
                  name="testEmail"
                  type="email"
                  defaultValue={testEmail}
                  className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none placeholder:text-[#7d7d7d]"
                  placeholder="admin@example.com"
                  required
                />
              </label>
              <button type="submit" className="rounded-xl bg-[#64748b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7b8aa0]">
                Send Test Email
              </button>
            </form>
          </div>
        </Card>

        <Card surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8e8ea0]">Schedule</p>
              <h2 className="text-xl font-semibold text-[#ececec]">Schedule campaign</h2>
              <p className="text-sm text-[#b4b4b4]">
                Status: <span className="font-medium text-[#ececec]">{data.status}</span> · Scheduled date: <span className="font-medium text-[#ececec]">{formatDateTime(data.scheduled_at)}</span> · Sent date: <span className="font-medium text-[#ececec]">{formatDateTime(data.sent_at)}</span>
              </p>
              <p className="text-sm text-amber-200">
                This campaign will automatically send to the selected audience at the scheduled time.
              </p>
            </div>
            <div className="grid w-full max-w-2xl gap-4 md:grid-cols-2">
              <form action={scheduleCampaignAction} className="space-y-3 rounded-2xl border border-[#3a3a3a] bg-[#252525] p-4">
                <input type="hidden" name="campaignId" value={campaignId} />
                <label className="block space-y-1">
                  <span className="text-xs uppercase tracking-[0.22em] text-[#8e8ea0]">Schedule date and time</span>
                  <input
                    name="scheduledAt"
                    type="datetime-local"
                    defaultValue={scheduledInputValue}
                    className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none"
                    required
                    disabled={readOnly}
                  />
                </label>
                <button
                  type="submit"
                  disabled={readOnly}
                  className="rounded-xl bg-[#64748b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7b8aa0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Schedule Campaign
                </button>
              </form>
              <form action={unscheduleCampaignAction} className="space-y-3 rounded-2xl border border-[#3a3a3a] bg-[#252525] p-4">
                <input type="hidden" name="campaignId" value={campaignId} />
                <p className="text-sm text-[#b4b4b4]">
                  Move a scheduled campaign back to draft so you can keep editing or delay launch.
                </p>
                <button
                  type="submit"
                  disabled={data.status !== 'scheduled'}
                  className="rounded-xl border border-[#4a4a4a] bg-[#1f1f1f] px-4 py-3 text-sm font-semibold text-[#ececec] transition hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Unschedule Campaign
                </button>
              </form>
            </div>
          </div>
        </Card>

        <Card surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8e8ea0]">Send Now</p>
              <h2 className="text-xl font-semibold text-[#ececec]">Deliver to audience</h2>
              <p className="text-sm text-[#b4b4b4]">
                Audience: <span className="font-medium text-[#ececec]">{getAudienceLabel(data.segment_slug)}</span>
                {data.status === 'draft' || data.status === 'scheduled' ? (
                  <span> · Estimated recipients: <span className="font-medium text-[#ececec]">{audienceEstimate.length}</span></span>
                ) : null}
              </p>
              <p className="text-sm text-amber-200">
                This will send this campaign to the selected audience and cannot be undone.
              </p>
            </div>
            <form action={sendCampaignNowAction} className="w-full max-w-lg space-y-3 rounded-2xl border border-[#3a3a3a] bg-[#252525] p-4">
              <input type="hidden" name="campaignId" value={campaignId} />
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.22em] text-[#8e8ea0]">Type SEND to confirm</span>
                <input
                  name="sendConfirmation"
                  type="text"
                  className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none placeholder:text-[#7d7d7d]"
                  placeholder="SEND"
                  required
                  disabled={!(data.status === 'draft' || data.status === 'scheduled')}
                />
              </label>
              <button
                type="submit"
                disabled={!(data.status === 'draft' || data.status === 'scheduled')}
                className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send Now
              </button>
            </form>
          </div>
        </Card>

        <CampaignEditorForm
          mode="edit"
          initialValues={initialValues}
          initialPreview={preview}
          action={updateCampaignDraftAction}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

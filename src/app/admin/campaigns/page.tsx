import Link from 'next/link';

import { Card } from '@pixiedvc/design-system';

import { archiveCampaignAction } from '@/app/admin/campaigns/actions';
import { requireAdminUser } from '@/lib/admin';
import { getAudienceLabel, type NewsletterCampaignListRow } from '@/lib/newsletter-campaigns';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function statusTone(status: string) {
  if (status === 'draft') return 'border-[#4b5563] bg-[#1f2937] text-[#d1d5db]';
  if (status === 'sent') return 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200';
  if (status === 'scheduled') return 'border-amber-500/30 bg-amber-500/12 text-amber-200';
  if (status === 'archived') return 'border-[#3a3a3a] bg-[#252525] text-[#8e8ea0]';
  return 'border-[#4b5563] bg-[#1f2937] text-[#d1d5db]';
}

export default async function AdminCampaignsPage() {
  await requireAdminUser('/admin/campaigns');
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-3">
            <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to admin
            </Link>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
              <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
                Campaigns
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
    .select('id, name, subject, status, segment_slug, created_at, scheduled_at, sent_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-3">
            <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to admin
            </Link>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
              <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
                Campaigns
              </h1>
            </div>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6">
            <p className="text-sm text-[#ff6b6b]">Unable to load campaigns.</p>
            <p className="mt-2 text-xs text-[#8e8ea0]">{error.message}</p>
          </Card>
        </div>
      </div>
    );
  }

  const rows = (data ?? []) as NewsletterCampaignListRow[];

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
        <header className="space-y-3">
          <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            ← Back to admin
          </Link>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
              <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
                Campaigns
              </h1>
              <p className="text-sm text-[#b4b4b4]">Create and manage newsletter campaign drafts before send and scheduling are enabled.</p>
            </div>
            <Link
              href="/admin/campaigns/new"
              className="inline-flex rounded-xl bg-[#64748b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7b8aa0]"
            >
              Create campaign
            </Link>
          </div>
        </header>

        <div className="overflow-x-auto rounded-3xl border border-[#3a3a3a] bg-[#2a2a2a] shadow-sm">
          <table className="min-w-full divide-y divide-[#3a3a3a] text-sm">
            <thead className="bg-[#212121] text-left text-xs font-semibold uppercase tracking-wide text-[#8e8ea0]">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Audience</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3a3a3a]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#8e8ea0]">
                    No campaigns yet.
                  </td>
                </tr>
              ) : (
                rows.map((campaign) => (
                  <tr key={campaign.id} className="text-[#b4b4b4]">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#ececec]">{campaign.name?.trim() || campaign.subject}</div>
                      <div className="text-xs text-[#8e8ea0]">{campaign.subject}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#c7c7c7]">{getAudienceLabel(campaign.segment_slug)}</td>
                    <td className="px-4 py-4 text-[#c7c7c7]">{formatDateTime(campaign.created_at)}</td>
                    <td className="px-4 py-4 text-[#c7c7c7]">{formatDateTime(campaign.scheduled_at)}</td>
                    <td className="px-4 py-4 text-[#c7c7c7]">{formatDateTime(campaign.sent_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link href={`/admin/campaigns/${campaign.id}`} className="text-sm font-medium text-[#9bb0c9] hover:text-[#ececec]">
                          Edit
                        </Link>
                        {campaign.status !== 'archived' ? (
                          <form action={archiveCampaignAction}>
                            <input type="hidden" name="campaignId" value={campaign.id} />
                            <button type="submit" className="text-sm font-medium text-rose-300 hover:text-rose-200">
                              Archive
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

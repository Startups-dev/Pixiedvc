import Link from 'next/link';

import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export default async function OwnerVerificationQueuePage() {
  await requireAdminUser('/admin/owners/verifications');
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return <p className="text-sm text-[#ff6b6b]">Service role key not configured.</p>;
  }

  const { data: verifications } = await adminClient
    .from('owner_verifications')
    .select(
      `
      owner_id,
      status,
      submitted_at,
      approved_at,
      rejected_at,
      profile:profiles!owner_verifications_owner_id_fkey (
        id,
        full_name,
        display_name,
        payout_email
      )
    `,
    )
    .order('submitted_at', { ascending: false });

  return (
    <div className="admin-owners-theme min-h-screen space-y-6 bg-[#212121] px-6 py-12 text-[#ececec]">
      <div>
        <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">Admin</Link>
        <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>Owner verifications</h1>
        <p className="text-sm text-[#b4b4b4]">Review verification submissions before owners receive matches.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="divide-y divide-slate-100">
          {(verifications ?? []).length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No verification submissions yet.</p>
          ) : (
            (verifications ?? []).map((row) => {
              const profile = row.profile;
              const payout = (profile?.payout_email ?? '').trim();
              const isSeed =
                !payout || payout.endsWith('@example.com') || payout.includes('owner.test+');
              const displayEmail = isSeed ? '—' : payout;
              const label =
                row.status === 'approved'
                  ? 'Approved'
                  : row.status === 'submitted'
                    ? 'Submitted'
                    : row.status === 'rejected'
                      ? 'Rejected'
                      : 'Not started';

              const statusClass =
                row.status === 'approved'
                  ? 'rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700'
                  : row.status === 'rejected'
                    ? 'rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700'
                    : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500';

              return (
                <div key={row.owner_id} className="flex flex-wrap items-center justify-between gap-4 px-3 py-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {profile?.full_name ?? profile?.display_name ?? 'Owner'}
                    </p>
                    <p className="text-xs text-slate-500">{displayEmail}</p>
                    <p className="text-xs text-slate-400">Payout: {displayEmail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={statusClass}>{label}</span>
                    <Link
                      href={`/admin/owners/verifications/${row.owner_id}`}
                      className="rounded-full border border-[#3a3a3a] bg-[#212121] px-3 py-1 text-xs font-semibold text-[#ececec] hover:bg-[#171717]"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

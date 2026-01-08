import Link from 'next/link';

import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export default async function OwnerVerificationQueuePage() {
  await requireAdminUser('/admin/owners/verifications');
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return <p className="text-sm text-rose-600">Service role key not configured.</p>;
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
        email,
        payout_email
      )
    `,
    )
    .order('submitted_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h1 className="text-3xl font-semibold text-slate-900">Owner verifications</h1>
        <p className="text-sm text-slate-500">Review verification submissions before owners receive matches.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="divide-y divide-slate-100">
          {(verifications ?? []).length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No verification submissions yet.</p>
          ) : (
            (verifications ?? []).map((row) => {
              const profile = row.profile;
              const label =
                row.status === 'approved'
                  ? 'Approved'
                  : row.status === 'submitted'
                    ? 'Submitted'
                    : row.status === 'rejected'
                      ? 'Rejected'
                      : 'Not started';
              return (
                <div key={row.owner_id} className="flex flex-wrap items-center justify-between gap-4 px-3 py-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {profile?.full_name ?? profile?.display_name ?? 'Owner'}
                    </p>
                    <p className="text-xs text-slate-500">{profile?.email ?? 'No email'}</p>
                    <p className="text-xs text-slate-400">Payout: {profile?.payout_email ?? 'Missing'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                      {label}
                    </span>
                    <Link
                      href={`/admin/owners/verifications/${row.owner_id}`}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300"
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

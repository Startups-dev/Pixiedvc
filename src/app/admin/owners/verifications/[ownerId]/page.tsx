import Link from 'next/link';
import ApproveVerificationButton from '@/components/admin/ApproveVerificationButton';
import dynamic from 'next/dynamic';

import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

type Props = {
  params: { ownerId: string };
};

export default async function OwnerVerificationDetailPage({ params }: Props) {
  const { user } = await requireAdminUser(`/admin/owners/verifications/${params.ownerId}`);
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return <p className="text-sm text-rose-600">Service role key not configured.</p>;
  }

  const { data: verification } = await adminClient
    .from('owner_verifications')
    .select(
      `
      owner_id,
      status,
      submitted_at,
      approved_at,
      rejected_at,
      review_notes,
      proof_files,
      profile:profiles!owner_verifications_owner_id_fkey (
        id,
        full_name,
        display_name,
        email,
        payout_email,
        phone,
        address_line1,
        address_line2,
        city,
        region,
        postal_code,
        country
      )
    `,
    )
    .eq('owner_id', params.ownerId)
    .maybeSingle();

  if (!verification) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Verification not found.</p>
        <Link href="/admin/owners/verifications" className="text-sm font-semibold text-indigo-600">
          Back to verifications
        </Link>
      </div>
    );
  }

  const profile = verification.profile;
  const label =
    verification.status === 'approved'
      ? 'Approved'
      : verification.status === 'submitted'
        ? 'Submitted'
        : verification.status === 'rejected'
          ? 'Rejected'
          : 'Not started';

  const statusClass =
    verification.status === 'approved'
      ? 'rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700'
      : verification.status === 'rejected'
        ? 'rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700'
        : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600';

  return (
    <div className="space-y-6">
      <Link href="/admin/owners/verifications" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        ← Back to verifications
      </Link>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Owner</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {profile?.full_name ?? profile?.display_name ?? 'Owner'}
            </h1>
            <p className="text-sm text-slate-500">{profile?.email ?? 'No email'}</p>
          </div>
          <span className={statusClass}>{label}</span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contact</p>
            <p className="mt-2 text-sm text-slate-700">Payout email: {profile?.payout_email ?? 'Missing'}</p>
            <p className="text-sm text-slate-700">Phone: {profile?.phone ?? '—'}</p>
            <p className="text-sm text-slate-700">
              Address: {profile?.address_line1 ?? '—'} {profile?.address_line2 ?? ''}
            </p>
            <p className="text-sm text-slate-700">
              {profile?.city ?? ''} {profile?.region ?? ''} {profile?.postal_code ?? ''} {profile?.country ?? ''}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Submission</p>
            <p className="mt-2 text-sm text-slate-700">Submitted: {verification.submitted_at ?? '—'}</p>
            <p className="text-sm text-slate-700">Approved: {verification.approved_at ?? '—'}</p>
            <p className="text-sm text-slate-700">Rejected: {verification.rejected_at ?? '—'}</p>
            {verification.review_notes ? (
              <p className="mt-2 text-sm text-rose-600">Notes: {verification.review_notes}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Proof files</p>
          <div className="mt-2 space-y-2 text-sm text-slate-600">
            {(verification.proof_files as Array<{ path: string; name: string }> | null)?.length ? (
              (verification.proof_files as Array<{ path: string; name: string }>).map((file) => (
                <div key={file.path} className="rounded-xl border border-slate-100 px-3 py-2">
                  {file.name}
                </div>
              ))
            ) : (
              <p>No files uploaded.</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ApproveVerificationButton ownerId={params.ownerId} />
          <form
            action={`/api/admin/owners/verifications/${params.ownerId}/reject`}
            method="post"
            className="flex flex-wrap items-center gap-2"
          >
            <input
              name="review_notes"
              required
              placeholder="Rejection reason (required)"
              className="rounded-full border border-slate-200 px-3 py-2 text-sm"
            />
            <button className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600">
              Reject
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

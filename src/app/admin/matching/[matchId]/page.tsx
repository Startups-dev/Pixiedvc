import Link from 'next/link';

import { requireAdminUser } from '@/lib/admin';
import { fetchAdminMatchDetail } from '@/lib/admin/matching';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import AdminMatchHeader from './AdminMatchHeader';
import AdminMatchTiles from './AdminMatchTiles';
import AdminMatchRentalPanel from './AdminMatchRentalPanel';
import AdminMatchControlPanel from './AdminMatchControlPanel';
import AdminAuditTrail from './AdminAuditTrail';

export default async function AdminMatchingDetailPage({
  params,
}: {
  params: { matchId: string };
}) {
  await requireAdminUser(`/admin/matching/${params.matchId}`);
  const supabase = await createSupabaseServerClient();
  const detail = await fetchAdminMatchDetail({
    authClient: supabase,
    matchId: params.matchId,
  });

  if (!detail.match) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Match not found.</p>
        <Link href="/admin/matching" className="text-sm font-semibold text-indigo-600">
          Back to matching
        </Link>
      </div>
    );
  }

  const booking = detail.booking;
  const match = detail.match;
  const owner = detail.owner;
  const rental = detail.rental;
  const milestones = detail.milestones ?? [];
  const payouts = detail.payouts ?? [];
  return (
    <div className="space-y-6">
      <Link href="/admin/matching" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        ← Back to matching
      </Link>

      <AdminMatchHeader
        matchId={params.matchId}
        invalidMatch={detail.flags.invalidMatch}
        hasRental={detail.flags.hasRental}
      />

      <AdminMatchTiles
        booking={booking}
        match={match}
        owner={owner}
      />

      <AdminMatchControlPanel
        matchId={match?.id ?? params.matchId}
        matchStatus={match?.status ?? null}
        hasRental={detail.flags.hasRental}
        bookingId={booking?.id ?? null}
      />

      <AdminMatchRentalPanel rental={rental} milestones={milestones} payouts={payouts} />

      <AdminAuditTrail entityType="booking_match" entityId={match?.id ?? params.matchId} />
    </div>
  );
}

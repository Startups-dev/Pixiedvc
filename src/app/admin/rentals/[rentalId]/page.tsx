import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { formatCurrency } from "@/lib/owner-portal";
import AdminRentalMilestonesClient from "@/app/admin/rentals/[rentalId]/AdminRentalMilestonesClient";

function formatRate(rateCents: number | null) {
  if (rateCents === null || !Number.isFinite(rateCents)) return "—";
  return `$${(rateCents / 100).toFixed(2)}/pt`;
}

export default async function AdminRentalDetailPage({ params }: { params: { rentalId: string } }) {
  await requireAdminUser(`/admin/rentals/${params.rentalId}`);

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f]">
          <p className="text-sm text-[#b4b4b4]">Missing service role key. Configure SUPABASE_SERVICE_ROLE_KEY to manage rentals.</p>
        </Card>
      </div>
    );
  }

  const { data: rental } = await adminClient
    .from("rentals")
    .select("id, owner_user_id, resort_code, room_type, check_in, check_out, points_required, rental_amount_cents, status, created_at, match_id, owner_rate_per_point_cents, owner_total_cents, owner_base_rate_per_point_cents, owner_premium_per_point_cents, owner_home_resort_premium_applied, rental_milestones(code, status, occurred_at)")
    .eq("id", params.rentalId)
    .maybeSingle();

  if (!rental) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f]">
          <p className="text-sm text-[#b4b4b4]">Rental not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-rentals-theme min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-12 text-[#ececec]">
      <header className="space-y-2">
        <a href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
          ← Back to admin
        </a>
        <h1 className="text-2xl font-semibold" style={{ color: '#64748b' }}>Rental milestone control</h1>
        <p className="text-sm text-[#b4b4b4]">Admin-only milestone completion for concierge operations.</p>
      </header>

      <Card surface="dark" className="space-y-3 border-[#3a3a3a] bg-[#2f2f2f]">
        <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Rental summary</p>
        <div className="grid gap-3 text-sm text-[#b4b4b4] sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Resort</p>
            <p className="font-semibold text-[#ececec]">{rental.resort_code}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Dates</p>
            <p className="font-semibold text-[#ececec]">
              {rental.check_in ?? "—"} – {rental.check_out ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Status</p>
            <p className="font-semibold text-[#ececec]">{rental.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Owner user</p>
            <p className="font-semibold text-[#ececec]">{rental.owner_user_id}</p>
          </div>
        </div>
      </Card>

      <Card surface="dark" className="space-y-3 border-[#3a3a3a] bg-[#2f2f2f]">
        <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Pricing breakdown</p>
        {rental.match_id ? (
          <PricingBreakdown rentalId={rental.id} matchId={rental.match_id} />
        ) : (
          <p className="text-sm text-[#b4b4b4]">No match linked to this rental.</p>
        )}
      </Card>

      <AdminRentalMilestonesClient
        rentalId={rental.id}
        milestones={(rental.rental_milestones ?? []) as { code: string; status: string; occurred_at: string | null }[]}
      />
      </div>
    </div>
  );
}

async function PricingBreakdown({ rentalId, matchId }: { rentalId: string; matchId: string }) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return null;

  const { data: match } = await adminClient
    .from("booking_matches")
    .select(
      "id, booking_id, owner_total_cents, owner_rate_per_point_cents, owner_base_rate_per_point_cents, owner_premium_per_point_cents, owner_home_resort_premium_applied",
    )
    .eq("id", matchId)
    .maybeSingle();

  const bookingId = match?.booking_id ?? null;
  const { data: booking } = bookingId
    ? await adminClient
        .from("booking_requests")
        .select("id, guest_total_cents, guest_rate_per_point_cents, total_points")
        .eq("id", bookingId)
        .maybeSingle()
    : { data: null };

  const guestTotal = booking?.guest_total_cents ?? null;
  const guestRate = booking?.guest_rate_per_point_cents ?? null;
  const ownerTotal = match?.owner_total_cents ?? null;
  const ownerRate = match?.owner_rate_per_point_cents ?? null;
  const ownerBase = match?.owner_base_rate_per_point_cents ?? null;
  const ownerPremium = match?.owner_premium_per_point_cents ?? null;
  const premiumApplied = Boolean(match?.owner_home_resort_premium_applied);
  const margin =
    typeof guestTotal === "number" && typeof ownerTotal === "number"
      ? guestTotal - ownerTotal
      : null;
  const perPointSpread =
    typeof guestRate === "number" && typeof ownerRate === "number"
      ? guestRate - ownerRate
      : null;

  return (
    <div className="grid gap-4 text-sm text-[#b4b4b4] sm:grid-cols-2">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Guest</p>
        <p className="font-semibold text-[#ececec]">{guestTotal !== null ? formatCurrency(guestTotal) : "—"}</p>
        <p className="text-xs text-[#8e8ea0]">Rate: {formatRate(guestRate)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Owner</p>
        <p className="font-semibold text-[#ececec]">{ownerTotal !== null ? formatCurrency(ownerTotal) : "—"}</p>
        <p className="text-xs text-[#8e8ea0]">
          Rate: {formatRate(ownerRate)}
          {premiumApplied && ownerPremium ? ` (+$${(ownerPremium / 100).toFixed(2)} home resort premium)` : ""}
        </p>
        {ownerBase !== null ? (
          <p className="text-[11px] text-[#8e8ea0]">Base rate: {formatRate(ownerBase)}</p>
        ) : null}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Margin</p>
        <p className="font-semibold text-[#ececec]">{margin !== null ? formatCurrency(margin) : "—"}</p>
        <p className="text-xs text-[#8e8ea0]">
          Per-point spread: {perPointSpread !== null ? formatRate(perPointSpread) : "—"}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Estimated fees</p>
        <p className="text-xs text-[#8e8ea0]">Placeholder for future payment fees.</p>
      </div>
    </div>
  );
}

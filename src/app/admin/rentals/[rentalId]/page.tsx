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
        <Card>
          <p className="text-sm text-muted">Missing service role key. Configure SUPABASE_SERVICE_ROLE_KEY to manage rentals.</p>
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
        <Card>
          <p className="text-sm text-muted">Rental not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-muted">
          ← Back to admin
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Rental milestone control</h1>
        <p className="text-sm text-muted">Admin-only milestone completion for concierge operations.</p>
      </header>

      <Card className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Rental summary</p>
        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Resort</p>
            <p className="font-semibold text-ink">{rental.resort_code}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Dates</p>
            <p className="font-semibold text-ink">
              {rental.check_in ?? "—"} – {rental.check_out ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
            <p className="font-semibold text-ink">{rental.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owner user</p>
            <p className="font-semibold text-ink">{rental.owner_user_id}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Pricing breakdown</p>
        {rental.match_id ? (
          <PricingBreakdown rentalId={rental.id} matchId={rental.match_id} />
        ) : (
          <p className="text-sm text-muted">No match linked to this rental.</p>
        )}
      </Card>

      <AdminRentalMilestonesClient
        rentalId={rental.id}
        milestones={(rental.rental_milestones ?? []) as { code: string; status: string; occurred_at: string | null }[]}
      />
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
    <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Guest</p>
        <p className="font-semibold text-ink">{guestTotal !== null ? formatCurrency(guestTotal) : "—"}</p>
        <p className="text-xs text-slate-500">Rate: {formatRate(guestRate)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owner</p>
        <p className="font-semibold text-ink">{ownerTotal !== null ? formatCurrency(ownerTotal) : "—"}</p>
        <p className="text-xs text-slate-500">
          Rate: {formatRate(ownerRate)}
          {premiumApplied && ownerPremium ? ` (+$${(ownerPremium / 100).toFixed(2)} home resort premium)` : ""}
        </p>
        {ownerBase !== null ? (
          <p className="text-[11px] text-slate-400">Base rate: {formatRate(ownerBase)}</p>
        ) : null}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Margin</p>
        <p className="font-semibold text-ink">{margin !== null ? formatCurrency(margin) : "—"}</p>
        <p className="text-xs text-slate-500">
          Per-point spread: {perPointSpread !== null ? formatRate(perPointSpread) : "—"}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estimated fees</p>
        <p className="text-xs text-slate-500">Placeholder for future payment fees.</p>
      </div>
    </div>
  );
}

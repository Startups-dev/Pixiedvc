import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { formatCurrency } from "@/lib/owner-portal";

type RentalRow = {
  id: string;
  match_id: string | null;
  resort_code: string | null;
  check_in: string | null;
  check_out: string | null;
  points_required: number | null;
  status: string;
};

type MatchRow = {
  id: string;
  booking_id: string | null;
  owner_total_cents: number | null;
  owner_rate_per_point_cents: number | null;
  owner_base_rate_per_point_cents: number | null;
  owner_premium_per_point_cents: number | null;
  owner_home_resort_premium_applied: boolean | null;
};

type BookingRow = {
  id: string;
  guest_total_cents: number | null;
  guest_rate_per_point_cents: number | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default async function AdminRentalsPage() {
  await requireAdminUser("/admin/rentals");

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Card>
          <p className="text-sm text-muted">Missing service role key. Configure SUPABASE_SERVICE_ROLE_KEY to view rentals.</p>
        </Card>
      </div>
    );
  }

  const { data: rentals } = await adminClient
    .from("rentals")
    .select("id, match_id, resort_code, check_in, check_out, points_required, status")
    .order("created_at", { ascending: false })
    .limit(50);

  const rentalRows = (rentals ?? []) as RentalRow[];
  const matchIds = rentalRows
    .map((rental) => rental.match_id)
    .filter((id): id is string => Boolean(id));

  const matchLookup = new Map<string, MatchRow>();
  const bookingLookup = new Map<string, BookingRow>();

  if (matchIds.length) {
    const { data: matches } = await adminClient
      .from("booking_matches")
      .select(
        "id, booking_id, owner_total_cents, owner_rate_per_point_cents, owner_base_rate_per_point_cents, owner_premium_per_point_cents, owner_home_resort_premium_applied",
      )
      .in("id", matchIds);

    (matches ?? []).forEach((match) => {
      matchLookup.set(match.id as string, match as MatchRow);
    });

    const bookingIds = (matches ?? [])
      .map((match) => (match as MatchRow).booking_id)
      .filter((id): id is string => Boolean(id));

    if (bookingIds.length) {
      const { data: bookings } = await adminClient
        .from("booking_requests")
        .select("id, guest_total_cents, guest_rate_per_point_cents")
        .in("id", bookingIds);

      (bookings ?? []).forEach((booking) => {
        bookingLookup.set(booking.id as string, booking as BookingRow);
      });
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-muted">
          ← Back to admin
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Rentals</h1>
        <p className="text-sm text-muted">Platform margin visibility for each rental.</p>
      </header>

      {rentalRows.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No rentals found.</Card>
      ) : (
        <Card className="overflow-x-auto p-4">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-3 py-2">Resort</th>
                <th className="px-3 py-2">Dates</th>
                <th className="px-3 py-2">Points</th>
                <th className="px-3 py-2">Guest total</th>
                <th className="px-3 py-2">Owner payout</th>
                <th className="px-3 py-2">Pixie margin</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rentalRows.map((rental) => {
                const match = rental.match_id ? matchLookup.get(rental.match_id) : null;
                const booking = match?.booking_id ? bookingLookup.get(match.booking_id) : null;
                const guestTotal = booking?.guest_total_cents ?? null;
                const ownerTotal = match?.owner_total_cents ?? null;
                const margin =
                  typeof guestTotal === "number" && typeof ownerTotal === "number"
                    ? guestTotal - ownerTotal
                    : null;

                return (
                  <tr key={rental.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-ink">{rental.resort_code ?? "—"}</td>
                    <td className="px-3 py-3">
                      {formatDate(rental.check_in)} → {formatDate(rental.check_out)}
                    </td>
                    <td className="px-3 py-3">{rental.points_required ?? "—"}</td>
                    <td className="px-3 py-3">{guestTotal !== null ? formatCurrency(guestTotal) : "—"}</td>
                    <td className="px-3 py-3">{ownerTotal !== null ? formatCurrency(ownerTotal) : "—"}</td>
                    <td className="px-3 py-3">{margin !== null ? formatCurrency(margin) : "—"}</td>
                    <td className="px-3 py-3">{rental.status}</td>
                    <td className="px-3 py-3">
                      <Link className="text-xs font-semibold text-brand hover:underline" href={`/admin/rentals/${rental.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

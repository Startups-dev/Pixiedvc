import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import { requireAdminUser } from "@/lib/admin";
import { READY_STAYS_SHOWCASE_FLAGS } from "@/lib/ready-stays/showcase-config";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type HistoryRow = {
  id: string;
  status: "sold" | "expired";
  check_in: string;
  check_out: string;
  room_type: string;
  points: number;
  owner_price_per_point_cents: number;
  guest_price_per_point_cents: number;
  sold_booking_request_id: string | null;
  updated_at: string;
  resorts?: {
    name?: string | null;
  } | null;
};

function formatDateRange(checkIn: string, checkOut: string) {
  return `${checkIn} → ${checkOut}`;
}

function formatCurrencyFromCents(value: number) {
  return `$${(value / 100).toFixed(2)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default async function ReadyStaysHistoryPage() {
  await requireAdminUser("/admin/ready-stays/history");

  if (!READY_STAYS_SHOWCASE_FLAGS.enableReadyStaysAdmin) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-2">
            <Link href="/admin/ready-stays" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to Ready Stays Admin
            </Link>
            <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Ready Stays History</h1>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Ready Stays admin controls are disabled. Set <code>READY_STAYS_ADMIN=true</code> to enable.
          </Card>
        </div>
      </div>
    );
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-2">
            <Link href="/admin/ready-stays" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to Ready Stays Admin
            </Link>
            <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Ready Stays History</h1>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Missing service role key. Configure <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </Card>
        </div>
      </div>
    );
  }

  const { data: rows, error } = await adminClient
    .from("ready_stays")
    .select(
      "id, status, check_in, check_out, room_type, points, owner_price_per_point_cents, guest_price_per_point_cents, sold_booking_request_id, updated_at, resorts(name)",
    )
    .in("status", ["sold", "expired"])
    .order("updated_at", { ascending: false })
    .limit(300);

  if (error) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-2">
            <Link href="/admin/ready-stays" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to Ready Stays Admin
            </Link>
            <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Ready Stays History</h1>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6">
            <p className="text-sm text-[#ff6b6b]">Unable to load Ready Stay history right now.</p>
            <p className="mt-2 text-xs text-[#8e8ea0]">{error.message}</p>
          </Card>
        </div>
      </div>
    );
  }

  const historyRows = (rows ?? []) as HistoryRow[];
  const soldCount = historyRows.filter((row) => row.status === "sold").length;
  const expiredCount = historyRows.filter((row) => row.status === "expired").length;

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
        <header className="space-y-3">
          <Link href="/admin/ready-stays" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            ← Back to Ready Stays Admin
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Ready Stays History</h1>
              <p className="text-sm text-[#b4b4b4]">All booked and expired listings in one place.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-full border border-[#3a3a3a] bg-[#2f2f2f] px-4 py-2 text-[#b4b4b4]">
                Sold: <span className="font-semibold text-[#ececec]">{soldCount}</span>
              </div>
              <div className="rounded-full border border-[#3a3a3a] bg-[#2f2f2f] px-4 py-2 text-[#b4b4b4]">
                Expired: <span className="font-semibold text-[#ececec]">{expiredCount}</span>
              </div>
            </div>
          </div>
        </header>

        {historyRows.length === 0 ? (
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            No sold or expired Ready Stays yet.
          </Card>
        ) : (
          <div className="grid gap-4">
            {historyRows.map((row) => {
              const totalReservationCents = row.guest_price_per_point_cents * row.points;
              const totalOwnerPayoutCents = row.owner_price_per_point_cents * row.points;

              return (
                <article key={row.id} className="rounded-2xl border border-[#3a3a3a] bg-[#2f2f2f] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-[#ececec]">{row.resorts?.name ?? "Ready Stay"}</p>
                      <p className="text-sm text-[#8e8ea0]">{formatDateRange(row.check_in, row.check_out)}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        row.status === "sold"
                          ? "bg-emerald-950/40 text-emerald-200"
                          : "bg-slate-800 text-slate-200"
                      }`}
                    >
                      {row.status === "sold" ? "Booked" : "Expired"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Room Type</p>
                      <p className="mt-2 text-sm text-[#ececec]">{row.room_type}</p>
                    </div>
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Points</p>
                      <p className="mt-2 text-sm text-[#ececec]">{row.points}</p>
                    </div>
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Owner Payout / Point</p>
                      <p className="mt-2 text-sm text-[#ececec]">{formatCurrencyFromCents(row.owner_price_per_point_cents)}</p>
                    </div>
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Guest Price / Point</p>
                      <p className="mt-2 text-sm text-[#ececec]">{formatCurrencyFromCents(row.guest_price_per_point_cents)}</p>
                    </div>
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Total Reservation Cost</p>
                      <p className="mt-2 text-sm text-[#ececec]">{formatCurrencyFromCents(totalReservationCents)}</p>
                    </div>
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Total Owner Payout</p>
                      <p className="mt-2 text-sm text-[#ececec]">{formatCurrencyFromCents(totalOwnerPayoutCents)}</p>
                    </div>
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3 sm:col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">
                        {row.status === "sold" ? "Booked / Updated" : "Expired / Updated"}
                      </p>
                      <p className="mt-2 text-sm text-[#ececec]">{formatDateTime(row.updated_at)}</p>
                      {row.status === "sold" && row.sold_booking_request_id ? (
                        <p className="mt-2 text-xs text-[#8e8ea0]">Booking request: {row.sold_booking_request_id}</p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

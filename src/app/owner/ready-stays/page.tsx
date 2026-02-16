import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Button, Card } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatCurrencyFromCents(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export default async function ReadyStaysPage({
  searchParams,
}: {
  searchParams?: { notice?: string };
}) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/ready-stays");
  }

  const { data: readyStays } = await supabase
    .from("ready_stays")
    .select(
      "id, rental_id, status, check_in, check_out, room_type, points, owner_price_per_point_cents, guest_price_per_point_cents, created_at, updated_at, resorts(name)",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const activeListings = (readyStays ?? []).filter((stay) => stay.status === "active");
  const soldListings = (readyStays ?? []).filter((stay) => stay.status === "sold");
  const activeCount = activeListings.length;
  const currentYear = new Date().getFullYear();
  const soldThisYear = soldListings.filter((stay) => {
    const value = stay.updated_at ? new Date(stay.updated_at) : null;
    return value ? value.getFullYear() === currentYear : false;
  }).length;
  const totalRevenueCents = soldListings.reduce((total, stay) => {
    const ownerPrice = Number(stay.owner_price_per_point_cents ?? 0);
    const points = Number(stay.points ?? 0);
    return total + ownerPrice * points;
  }, 0);
  const avgDaysToSell = (() => {
    if (soldListings.length === 0) return 0;
    const totalDays = soldListings.reduce((sum, stay) => {
      if (!stay.created_at || !stay.updated_at) return sum;
      const start = new Date(stay.created_at).getTime();
      const end = new Date(stay.updated_at).getTime();
      if (Number.isNaN(start) || Number.isNaN(end)) return sum;
      return sum + Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    }, 0);
    return Math.round(totalDays / soldListings.length);
  })();

  const pendingTransfers = soldListings.map((stay) => ({
    ...stay,
    transferStatus: "Awaiting transfer",
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      {searchParams?.notice === "select" ? (
        <Card className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Choose a reservation to list.
        </Card>
      ) : null}

      <Card className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0C1A37] via-[#10264D] to-[#0A1733] px-8 py-10 text-white shadow-[0_40px_90px_rgba(6,17,40,0.45)]">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.12),transparent_55%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(109,125,255,0.2),transparent_50%)]"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Ready Stays</p>
            <h1 className="text-4xl font-semibold tracking-tight !text-white">Instant Booking Inventory</h1>
            <p className="text-sm text-white/85">
              List a confirmed reservation and let guests book instantly.
            </p>
          </div>
          <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/50">Active Listings</p>
                <p className="mt-1 text-lg font-semibold text-white">{activeCount}</p>
              </div>
              <div>
                <p className="text-white/50">Sold This Year</p>
                <p className="mt-1 text-lg font-semibold text-white">{soldThisYear}</p>
              </div>
              <div>
                <p className="text-white/50">Total Revenue</p>
                <p className="mt-1 text-lg font-semibold text-white">{formatCurrencyFromCents(totalRevenueCents)}</p>
              </div>
              <div>
                <p className="text-white/50">Avg Time to Sell</p>
                <p className="mt-1 text-lg font-semibold text-white">{avgDaysToSell} days</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <section id="how-it-works" className="space-y-4">
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">How Ready Stays Works</h2>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p>1. Start with your private Disney reservation details.</p>
            <p>2. Upload your existing Disney confirmation number to verify the reservation.</p>
            <p>3. Once verified, your reservation can be listed as a Ready Stay for instant guest booking.</p>
            <p>4. Guests can book instantly, sign the agreement, and complete payment.</p>
            <p>5. Finalize transferring the reservation to guests via DVC.</p>
            <p>6. Collect your payout.</p>
          </div>
        </Card>
      </section>

      <section id="post-ready-stay" className="space-y-4">
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">List a Ready Stay</h2>
          <p className="mt-2 text-sm text-muted">
            Have a confirmed reservation? Verify your private reservation, then list it as a public Ready Stay for guest booking.
          </p>
          <div className="mt-5">
            <Button asChild>
              <Link href="/owner/dashboard?tab=listings">List a Ready Stay</Link>
            </Button>
          </div>
        </Card>
      </section>

      <section id="active" className="space-y-4">
        <Card className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1 border-b border-slate-200 pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Your Ready Stays</h2>
            <p className="text-sm text-muted">Manage and monitor your live listings.</p>
          </div>
          {activeListings.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
              No live listings yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-4 py-3 font-semibold">Resort</th>
                    <th className="px-4 py-3 font-semibold">Dates</th>
                    <th className="px-4 py-3 font-semibold">Points</th>
                    <th className="px-4 py-3 font-semibold">Price/pt</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activeListings.map((stay) => (
                    <tr key={stay.id}>
                      <td className="px-4 py-3 text-ink">{stay.resorts?.name ?? "Listing"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(stay.check_in)} - {formatDate(stay.check_out)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{stay.points ?? 0}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatCurrencyFromCents(stay.guest_price_per_point_cents)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatCurrencyFromCents((stay.guest_price_per_point_cents ?? 0) * (stay.points ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-slate-600">Active</td>
                      <td className="px-4 py-3">
                        <Link href={`/owner/ready-stays/${stay.id}`} className="text-xs font-semibold text-brand hover:underline">
                          View/Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section id="pending-transfers" className="space-y-4">
        <Card className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Pending Transfers</h2>
          </div>
          {/* TODO: Expand this to include contract-linked transfers once transfer completion fields are available. */}
          {pendingTransfers.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
              No transfers in progress.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-4 py-3 font-semibold">Resort</th>
                    <th className="px-4 py-3 font-semibold">Dates</th>
                    <th className="px-4 py-3 font-semibold">Points</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pendingTransfers.map((stay) => (
                    <tr key={stay.id}>
                      <td className="px-4 py-3 text-ink">{stay.resorts?.name ?? "Listing"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(stay.check_in)} - {formatDate(stay.check_out)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{stay.points ?? 0}</td>
                      <td className="px-4 py-3 text-slate-600">{stay.transferStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section id="completed-sales" className="space-y-4">
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <details>
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.2em] text-ink">
              Completed Sales
            </summary>
            <div className="mt-4">
              {soldListings.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
                  No completed sales yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                        <th className="px-4 py-3 font-semibold">Resort</th>
                        <th className="px-4 py-3 font-semibold">Dates</th>
                        <th className="px-4 py-3 font-semibold">Points</th>
                        <th className="px-4 py-3 font-semibold">Total</th>
                        <th className="px-4 py-3 font-semibold">Sold date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {soldListings.map((stay) => (
                        <tr key={stay.id}>
                          <td className="px-4 py-3 text-ink">{stay.resorts?.name ?? "Listing"}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(stay.check_in)} - {formatDate(stay.check_out)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{stay.points ?? 0}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatCurrencyFromCents((stay.guest_price_per_point_cents ?? 0) * (stay.points ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(stay.updated_at ?? null)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </details>
        </Card>
      </section>
    </div>
  );
}

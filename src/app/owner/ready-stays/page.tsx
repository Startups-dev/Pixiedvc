import Link from "next/link";
import { redirect } from "next/navigation";

import { Button, Card } from "@pixiedvc/design-system";
import PendingTransfersCard from "./PendingTransfersCard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireOwnerAccess } from "@/lib/owner/requireOwnerAccess";

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

function getOwnerListingStage(stay: {
  status: string | null;
  verification_status?: string | null;
}) {
  if (stay.status === "sold") return { label: "Sold", className: "border-emerald-200 bg-emerald-50 text-emerald-800" };
  if (stay.verification_status === "proof_uploaded") {
    return { label: "Pending Review", className: "border-amber-200 bg-amber-50 text-amber-800" };
  }
  if (stay.status === "active") return { label: "Active", className: "border-sky-200 bg-sky-50 text-sky-800" };
  if (stay.verification_status === "rejected") {
    return { label: "Needs Info", className: "border-rose-200 bg-rose-50 text-rose-700" };
  }
  if (stay.status === "draft" || stay.status === "paused") {
    return { label: "Pending Review", className: "border-amber-200 bg-amber-50 text-amber-800" };
  }
  return { label: "Draft", className: "border-slate-200 bg-slate-50 text-slate-700" };
}

function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400">
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 7h16" />
          <path d="M7 3h10l1 4H6l1-4Z" />
          <path d="M6 11h12v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7Z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
    </div>
  );
}

export default async function ReadyStaysPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string }> | { notice?: string };
}) {
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;
  const { user, owner } = await requireOwnerAccess("/owner/ready-stays");
  await createSupabaseServerClient();

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    redirect("/owner/dashboard?tab=listings");
  }

  const ownerIds = Array.from(
    new Set(
      [user.id, owner.id ?? null, owner.user_id ?? null].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      ),
    ),
  );

  const { data: readyStays } = await adminClient
    .from("ready_stays")
    .select(
      "id, rental_id, status, verification_status, sold_booking_request_id, booking_request_id, check_in, check_out, room_type, points, owner_price_per_point_cents, guest_price_per_point_cents, created_at, updated_at, reservation_proof_uploaded_at, resorts(name)",
    )
    .in("owner_id", ownerIds)
    .order("created_at", { ascending: false });

  const normalizedReadyStays = (readyStays ?? []).map((stay) => ({
    ...stay,
    status:
      stay.status === "active" && stay.verification_status === "proof_uploaded"
        ? ("draft" as typeof stay.status)
        : stay.status,
  }));

  const soldListings = normalizedReadyStays.filter((stay) => stay.status === "sold");

  const soldBookingIds = Array.from(
    new Set(
      normalizedReadyStays
        .map((stay) => stay.sold_booking_request_id ?? stay.booking_request_id ?? null)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  const { data: soldBookingRequests } = soldBookingIds.length
    ? await adminClient
        .from("booking_requests")
        .select("id, status, lead_guest_name, owner_transfer_confirmed_at")
        .in("id", soldBookingIds)
    : { data: [] };

  const soldBookingById = new Map(
    (soldBookingRequests ?? []).map((booking) => [booking.id, booking]),
  );

  const pendingTransfers = normalizedReadyStays
    .map((stay) => {
      const linkedBookingId = stay.sold_booking_request_id ?? stay.booking_request_id ?? null;
      const booking =
        linkedBookingId && soldBookingById.has(linkedBookingId)
          ? soldBookingById.get(linkedBookingId)
          : null;
      if (
        !booking ||
        booking.status !== "paid_waiting_owner_transfer" ||
        Boolean(booking.owner_transfer_confirmed_at)
      ) {
        return null;
      }
      return {
        ...stay,
        bookingId: booking.id,
        guestName: booking.lead_guest_name ?? null,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  const pendingTransferRows = pendingTransfers.map((stay) => ({
    id: stay.id,
    bookingId: stay.bookingId,
    resortName: stay.resorts?.name ?? "Listing",
    checkIn: stay.check_in,
    checkOut: stay.check_out,
    points: stay.points ?? 0,
    guestName: stay.guestName ?? null,
  }));
  const pendingTransferStayIds = new Set(pendingTransfers.map((stay) => stay.id));

  const activeListings = normalizedReadyStays.filter(
    (stay) =>
      stay.status === "active" &&
      stay.verification_status !== "proof_uploaded" &&
      !pendingTransferStayIds.has(stay.id),
  );
  const reviewListings = normalizedReadyStays.filter(
    (stay) =>
      (["draft", "paused"].includes(stay.status ?? "") || stay.verification_status === "proof_uploaded") &&
      !pendingTransferStayIds.has(stay.id),
  );
  const dashboardListings = normalizedReadyStays.filter(
    (stay) => !["sold", "expired", "removed"].includes(stay.status ?? "") && !pendingTransferStayIds.has(stay.id),
  );
  const activeCount = activeListings.length;
  const pendingReviewCount = reviewListings.length;
  const confirmedSalesCount = soldListings.length;
  const estimatedPayoutCents = dashboardListings.reduce((total, stay) => {
    return total + Number(stay.owner_price_per_point_cents ?? 0) * Number(stay.points ?? 0);
  }, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      {resolvedSearchParams?.notice === "select" ? (
        <Card className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Choose a reservation to list.
        </Card>
      ) : null}
      {resolvedSearchParams?.notice === "transferred" ? (
        <Card className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Transfer confirmed. Guest has been notified.
        </Card>
      ) : null}
      {resolvedSearchParams?.notice === "already_transferred" ? (
        <Card className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          This reservation was already marked as transferred.
        </Card>
      ) : null}
      {resolvedSearchParams?.notice === "submitted" ? (
        <Card className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Your Ready Stay has been submitted. Listings may take up to 10 minutes to appear.
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
            <h1 className="text-4xl font-semibold tracking-tight !text-white">Ready Stays Dashboard</h1>
            <p className="max-w-xl text-sm text-white/85">
              List confirmed reservations, monitor activity, and manage payouts in one place.
            </p>
          </div>
          <div className="min-w-[280px] rounded-3xl border border-white/10 bg-white/5 p-5 text-xs text-white/70 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Active Listings", value: String(activeCount), muted: activeCount === 0 },
                { label: "Pending Review", value: String(pendingReviewCount), muted: pendingReviewCount === 0 },
                { label: "Confirmed Sales", value: String(confirmedSalesCount), muted: confirmedSalesCount === 0 },
                {
                  label: "Estimated Payouts",
                  value: estimatedPayoutCents > 0 ? formatCurrencyFromCents(estimatedPayoutCents) : "—",
                  muted: estimatedPayoutCents === 0,
                },
              ].map((metric) => (
                <div key={metric.label} className="space-y-1">
                  <p className="text-white/50">{metric.label}</p>
                  <p className={`text-lg font-semibold ${metric.muted ? "text-white/45" : "text-white"}`}>{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <section id="how-it-works" className="space-y-4">
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3">
            <Link href="/owner/ready-stays/faq" className="text-xs font-semibold text-brand hover:underline">
              Read the Ready Stays FAQ
            </Link>
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.2em] text-ink">
              How Ready Stays Works
            </summary>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>1. Start with your private Disney reservation details.</p>
              <p>2. Upload your existing Disney confirmation number to verify the reservation.</p>
              <p>3. Once verified, your reservation can be listed as a Ready Stay for instant guest booking.</p>
              <p>4. Guests can book instantly, sign the agreement, and complete payment.</p>
              <p>5. Finalize transferring the reservation to guests via DVC.</p>
              <p>6. Collect your payout.</p>
            </div>
          </details>
        </Card>
      </section>

      <section id="post-ready-stay" className="space-y-4">
        <Card className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0B1B3A] text-white shadow-sm">
                  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12h16" />
                    <path d="M12 4v16" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Submit a Ready Stay</h2>
              </div>
              <p className="text-base font-medium text-ink">
                Have a confirmed Disney Vacation Club reservation? Submit it for review and turn it into a public Ready Stay guests can instantly book.
              </p>
              <div className="grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                <p>• Reservation proof verified before publishing</p>
                <p>• You stay in control of payout details</p>
                <p>• Guests can book instantly once live</p>
                <p>• Payouts are confirmed before booking closes</p>
              </div>
            </div>
            <div className="flex min-w-[220px] flex-col items-start gap-3">
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Fastest path to guest booking
              </div>
              <Button asChild className="!text-white hover:!text-white">
                <Link href="/owner/dashboard?tab=listings&mode=add" className="!text-white hover:!text-white" style={{ color: "#fff" }}>
                  Submit Ready Stay
                </Link>
              </Button>
            </div>
          </div>
        </Card>
        <Card className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Need to move expiring points fast?</h2>
          <p className="mt-2 text-sm text-muted">
            Submit expiring points for concierge-assisted last-minute placement.
          </p>
          <div className="mt-5">
            <Button asChild variant="ghost">
              <Link href="/owner/liquidation-opportunities">Submit Expiring Points</Link>
            </Button>
          </div>
        </Card>
      </section>

      <section id="trust" className="space-y-4">
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-700">
            You stay in control. PixieDVC reviews every Ready Stay before it goes public, and payout details are confirmed before guest booking.
          </p>
        </Card>
      </section>

      <section id="active" className="space-y-4">
        <Card className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1 border-b border-slate-200 pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Your Ready Stays</h2>
            <p className="text-sm text-muted">Monitor listing stage, proof status, and projected payout totals.</p>
          </div>
          {dashboardListings.length === 0 ? (
            <EmptyState
              title="No Ready Stays yet."
              body="Submit a confirmed reservation to start building your public Ready Stay inventory."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-4 py-3 font-semibold">Resort</th>
                    <th className="px-4 py-3 font-semibold">Dates</th>
                    <th className="px-4 py-3 font-semibold">Approval</th>
                    <th className="px-4 py-3 font-semibold">Proof</th>
                    <th className="px-4 py-3 font-semibold">Points</th>
                    <th className="px-4 py-3 font-semibold">Your Payout/PT</th>
                    <th className="px-4 py-3 font-semibold">Your Payout</th>
                    <th className="px-4 py-3 font-semibold">Listing Status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {dashboardListings.map((stay) => {
                    const stage = getOwnerListingStage(stay);
                    return (
                    <tr key={stay.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-ink">{stay.resorts?.name ?? "Listing"}</p>
                          <p className="text-xs text-slate-500">{stay.room_type}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(stay.check_in)} - {formatDate(stay.check_out)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${stage.className}`}>
                          {stage.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {stay.reservation_proof_uploaded_at ? "Received" : "Missing"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {stay.points ?? 0}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatCurrencyFromCents(stay.owner_price_per_point_cents)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">
                        {formatCurrencyFromCents((stay.owner_price_per_point_cents ?? 0) * (stay.points ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {stay.verification_status === "proof_uploaded"
                          ? "Submitted for review"
                          : stay.status === "active"
                            ? "Visible to guests"
                            : "Preparing to publish"}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/owner/ready-stays/${stay.id}`} className="text-xs font-semibold text-brand hover:underline">
                          View/Edit
                        </Link>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section id="pending-transfers" className="space-y-4">
        {pendingTransferRows.length > 0 ? (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm font-semibold text-ink">Transfer required</p>
            <p className="mt-1 text-sm text-slate-500">
              A guest has paid. Complete the Disney transfer to release the confirmation number.
            </p>
          </div>
        ) : null}
        <Card className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Pending Transfers</h2>
          </div>
          {/* TODO: Expand this to include contract-linked transfers once transfer completion fields are available. */}
          {pendingTransferRows.length === 0 ? (
            <EmptyState
              title="No pending transfers right now."
              body="Once a guest completes payment and a transfer is needed, those reservations will appear here."
            />
          ) : (
            <PendingTransfersCard initialRows={pendingTransferRows} />
          )}
        </Card>
      </section>

      <section id="completed-sales" className="space-y-4">
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <details open>
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.2em] text-ink">
              Completed Sales
            </summary>
            <div className="mt-4">
              {soldListings.length === 0 ? (
                <EmptyState
                  title="No completed Ready Stay sales yet."
                  body="Approved listings will appear here once booked."
                />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                        <th className="px-4 py-3 font-semibold">Resort</th>
                        <th className="px-4 py-3 font-semibold">Dates</th>
                        <th className="px-4 py-3 font-semibold">Points</th>
                        <th className="px-4 py-3 font-semibold">Your Payout/PT</th>
                        <th className="px-4 py-3 font-semibold">Your Payout</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Sold date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {soldListings.map((stay) => (
                        <tr key={stay.id}>
                          <td className="px-4 py-3 text-ink">{stay.resorts?.name ?? "Listing"}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatDate(stay.check_in)} - {formatDate(stay.check_out)}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{stay.points ?? 0}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatCurrencyFromCents(stay.owner_price_per_point_cents)}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatCurrencyFromCents((stay.owner_price_per_point_cents ?? 0) * (stay.points ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                              Transferred
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{formatDate(stay.updated_at ?? null)}</td>
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

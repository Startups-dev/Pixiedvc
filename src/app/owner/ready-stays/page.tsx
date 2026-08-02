import Link from "next/link";
import { redirect } from "next/navigation";

import { Button, Card } from "@pixiedvc/design-system";
import PendingTransfersCard from "./PendingTransfersCard";
import OwnerEmptyState from "@/components/owner/shared/OwnerEmptyState";
import OwnerPageHeader from "@/components/owner/shared/OwnerPageHeader";
import OwnerRecordStatusBadge from "@/components/owner/shared/OwnerRecordStatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireOwnerAccess } from "@/lib/owner/requireOwnerAccess";
import { buildOwnerReadyStayListItems } from "@/lib/owner/secondary-subpages";

function formatCurrencyFromCents(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function statusTone(group: string) {
  if (group === "completed" || group === "active") return "success";
  if (group === "inactive") return "issue";
  return "attention";
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
      "id, rental_id, status, verification_status, sold_booking_request_id, booking_request_id, check_in, check_out, room_type, points, owner_price_per_point_cents, created_at, updated_at, reservation_proof_uploaded_at, resorts(name)",
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
        .select("id, status, owner_transfer_confirmed_at")
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
  const dashboardItems = buildOwnerReadyStayListItems(dashboardListings);
  const soldItems = buildOwnerReadyStayListItems(soldListings);

  return (
    <div className="space-y-8">
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

      <OwnerPageHeader
        eyebrow="Ready Stays"
        title="Ready Stays"
        description="List confirmed reservations, monitor owner-facing listing status, and complete transfer actions when a guest books."
        summary={`${dashboardListings.length} active listing${dashboardListings.length === 1 ? "" : "s"}`}
      />

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Active listings", value: String(activeCount), helper: "Visible owner inventory" },
          { label: "Pending review", value: String(pendingReviewCount), helper: "Submitted or draft listings" },
          { label: "Confirmed sales", value: String(confirmedSalesCount), helper: "Booked Ready Stays" },
          {
            label: "Estimated owner payout",
            value: estimatedPayoutCents > 0 ? formatCurrencyFromCents(estimatedPayoutCents) : "Unavailable",
            helper: "Owner rate times listing points",
          },
        ].map((metric) => (
          <Card key={metric.label} className="rounded-[18px] border border-[#E7E7E4] bg-white p-5 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7A8495]">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[#10224A]">{metric.value}</p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">{metric.helper}</p>
          </Card>
        ))}
      </section>

      <section id="how-it-works" className="space-y-4">
        <Card className="rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
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
        <Card className="rounded-[18px] border border-[#E7E7E4] bg-white p-7 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
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
        <Card className="rounded-[18px] border border-[#E8D6A8] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
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
        <Card className="rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
          <p className="text-sm font-medium text-slate-700">
            You stay in control. HannaDVC reviews every Ready Stay before it goes public, and payout details are confirmed before guest booking.
          </p>
        </Card>
      </section>

      <section id="active" className="space-y-4">
        <Card className="space-y-4 rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
          <div className="space-y-1 border-b border-slate-200 pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Your Ready Stays</h2>
            <p className="text-sm text-muted">Monitor listing stage, proof status, and projected payout totals.</p>
          </div>
          {dashboardItems.length === 0 ? (
            <OwnerEmptyState
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
                  {dashboardItems.map((stay) => (
                    <tr key={stay.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-ink">{stay.resortLabel}</p>
                          <p className="text-xs text-slate-500">{stay.roomLabel}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{stay.dateLabel}</td>
                      <td className="px-4 py-3">
                        <OwnerRecordStatusBadge label={stay.statusLabel} tone={statusTone(stay.group)} />
                      </td>
                      <td className="px-4 py-3 text-slate-500">{stay.proofLabel}</td>
                      <td className="px-4 py-3 text-slate-500">{stay.pointsLabel}</td>
                      <td className="px-4 py-3 text-slate-500">{stay.ownerRateLabel}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{stay.estimatedOwnerPayoutLabel}</td>
                      <td className="px-4 py-3 text-slate-500">{stay.group === "active" ? "Visible to guests" : stay.statusLabel}</td>
                      <td className="px-4 py-3">
                        <Link href={stay.detailHref} className="text-xs font-semibold text-brand hover:underline">
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
            <OwnerEmptyState
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
              {soldItems.length === 0 ? (
                <OwnerEmptyState
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
                      {soldItems.map((stay) => (
                        <tr key={stay.id}>
                          <td className="px-4 py-3 text-ink">{stay.resortLabel}</td>
                          <td className="px-4 py-3 text-slate-500">{stay.dateLabel}</td>
                          <td className="px-4 py-3 text-slate-500">{stay.pointsLabel}</td>
                          <td className="px-4 py-3 text-slate-500">{stay.ownerRateLabel}</td>
                          <td className="px-4 py-3 text-slate-500">{stay.estimatedOwnerPayoutLabel}</td>
                          <td className="px-4 py-3 text-slate-500">
                            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                              {stay.statusLabel}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{stay.updatedAtLabel}</td>
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

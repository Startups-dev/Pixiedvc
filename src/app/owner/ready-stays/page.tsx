import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckSquare } from "lucide-react";

import { Card } from "@pixiedvc/design-system";
import PendingTransfersCard from "./PendingTransfersCard";
import OwnerReadyStayInventory from "./OwnerReadyStayInventory";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireOwnerAccess } from "@/lib/owner/requireOwnerAccess";
import { buildOwnerReadyStayListItems } from "@/lib/owner/secondary-subpages";

const hannaIconPaths = {
  readyStayActive: "/images/hanna-icons/ready-stay-active.png",
  concierge: "/images/hanna-icons/concierge.png",
  payoutComplete: "/images/affiliate/icons/payout-ribbon-transparent-v4.png",
} as const;

function HannaUtilityIcon({ src, className = "h-9 w-9" }: { src: string; className?: string }) {
  return (
    <span className={`relative block shrink-0 ${className}`}>
      <img src={src} alt="" className="h-full w-full object-contain" aria-hidden="true" />
    </span>
  );
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
      "id, rental_id, status, verification_status, sold_booking_request_id, booking_request_id, check_in, check_out, room_type, points, owner_price_per_point_cents, created_at, updated_at, reservation_proof_uploaded_at, is_visible_publicly, slug, title, image_url, expires_at, locked_until, resorts(name, slug, calculator_code)",
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
  const estimatedPayoutCents = dashboardListings.reduce((total, stay) => {
    return total + Number(stay.owner_price_per_point_cents ?? 0) * Number(stay.points ?? 0);
  }, 0);
  const dashboardItems = buildOwnerReadyStayListItems(dashboardListings);
  const soldItems = buildOwnerReadyStayListItems(soldListings);

  return (
    <div className="space-y-12 bg-white px-6 py-10 sm:px-8 lg:px-12">
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

      <OwnerReadyStayInventory
        items={dashboardItems}
        activeCount={activeCount}
        pendingReviewCount={pendingReviewCount}
        potentialPayoutLabel={estimatedPayoutCents > 0 ? formatCurrencyFromCents(estimatedPayoutCents) : "Unavailable"}
      />

      <section id="post-ready-stay" className="grid gap-8 border-b border-[#E1D7C7] pb-10 lg:grid-cols-2 lg:gap-0">
        {dashboardItems.length > 0 ? (
          <div className="flex gap-5 pr-0 lg:pr-10">
            <HannaUtilityIcon src={hannaIconPaths.readyStayActive} />
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#10224A]">Have another confirmed reservation?</h2>
              <p className="mt-2 text-sm leading-6 text-[#51607A]">Submit it for Hanna review when you are ready to list.</p>
              <Link href="/owner/dashboard?tab=listings&mode=add" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#10224A] hover:underline">
                List a Ready Stay
                <ArrowRight className="h-4 w-4 text-[#9A6A1E]" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : null}
        <div className={dashboardItems.length > 0 ? "flex gap-5 border-[#E1D7C7] lg:border-l lg:pl-10" : "flex gap-5"}>
          <HannaUtilityIcon src={hannaIconPaths.concierge} className="h-10 w-10" />
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#10224A]">Need to move expiring points fast?</h2>
            <p className="mt-2 text-sm leading-6 text-[#51607A]">
              Submit expiring points for concierge-assisted last-minute placement.
            </p>
            <Link href="/owner/liquidation-opportunities" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#10224A] hover:underline">
              Submit Expiring Points
              <ArrowRight className="h-4 w-4 text-[#9A6A1E]" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-10 lg:grid-cols-2 lg:gap-0">
        <div id="pending-transfers" className="lg:pr-10">
          <div className="flex items-center justify-between border-b border-[#C89A3D]/45 pb-4">
            <h2 className="font-serif text-2xl font-semibold text-[#10224A]">Pending Transfers</h2>
          </div>
          <div className="py-10">
            {pendingTransferRows.length === 0 ? (
              <div className="flex items-start gap-6">
                <CheckSquare className="mt-1 h-9 w-9 shrink-0 text-[#10224A]" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className="text-base font-semibold text-[#10224A]">No pending transfers right now.</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[#51607A]">
                    Once a guest completes payment and a transfer is needed, those reservations will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-[#10224A]">Transfer required</p>
                <p className="text-sm leading-6 text-[#51607A]">
                  A guest has paid. Complete the Disney transfer to release the confirmation number.
                </p>
                <PendingTransfersCard initialRows={pendingTransferRows} />
              </div>
            )}
          </div>
        </div>

        <div id="completed-sales" className="border-[#E1D7C7] lg:border-l lg:pl-10">
          <div className="flex items-center justify-between border-b border-[#C89A3D]/45 pb-4">
            <h2 className="font-serif text-2xl font-semibold text-[#10224A]">Completed Sales</h2>
          </div>
          <div className="py-10">
            {soldItems.length === 0 ? (
              <div className="flex items-start gap-6">
                <HannaUtilityIcon src={hannaIconPaths.payoutComplete} className="h-10 w-10" />
                <div>
                  <p className="text-base font-semibold text-[#10224A]">No completed sales yet.</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[#51607A]">
                    Your completed Ready Stay sales will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#E1D7C7] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-[#6F7B93]">
                      <th className="py-3 pr-4 font-semibold">Resort</th>
                      <th className="px-4 py-3 font-semibold">Dates</th>
                      <th className="px-4 py-3 font-semibold">Points</th>
                      <th className="px-4 py-3 font-semibold">Payout</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE8DC]">
                    {soldItems.map((stay) => (
                      <tr key={stay.id}>
                        <td className="py-3 pr-4 font-semibold text-[#10224A]">{stay.resortLabel}</td>
                        <td className="px-4 py-3 text-[#51607A]">{stay.dateLabel}</td>
                        <td className="px-4 py-3 text-[#51607A]">{stay.pointsLabel}</td>
                        <td className="px-4 py-3 text-[#51607A]">{stay.estimatedOwnerPayoutLabel}</td>
                        <td className="px-4 py-3 text-[#51607A]">{stay.displayStatusLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-[#E1D7C7] pt-6">
        <details>
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.18em] text-[#10224A]">
            Ready Stays FAQ
          </summary>
          <div className="mt-4 max-w-2xl space-y-3 text-sm leading-6 text-[#51607A]">
            <p>HannaDVC reviews every Ready Stay before it goes public, and payout details are confirmed before guest booking.</p>
            <Link href="/owner/ready-stays/faq" className="inline-flex items-center gap-2 font-semibold text-[#10224A] hover:underline">
              Read the Ready Stays FAQ
              <ArrowRight className="h-4 w-4 text-[#9A6A1E]" aria-hidden="true" />
            </Link>
          </div>
        </details>
      </section>
    </div>
  );
}

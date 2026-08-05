import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import GuestTripHero from "@/components/guest/dashboard/GuestTripHero";
import GuestTripOperations from "@/components/guest/dashboard/GuestTripOperations";
import GuestTopBar from "@/components/guest/shell/GuestTopBar";
import type { GuestTripSwitcherItem } from "@/components/guest/shell/GuestTripSwitcher";
import {
  buildGuestTripHeroViewModel,
  formatDateRange,
} from "@/lib/guest/hero-view-model";
import {
  buildGuestTripOperationsViewModel,
  type GuestTripOperationsContract,
  type GuestTripOperationsDocument,
  type GuestTripOperationsTransaction,
  type GuestTripOperationsTraveler,
} from "@/lib/guest/trip-operations-view-model";
import { ComingSoonOverlay, ConfirmationCopy } from "./TripDetailsClient";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { isAdminEmailStrict } from "@/lib/admin-emails";

type ResortRecord = {
  name: string | null;
  slug: string | null;
  calculator_code: string | null;
};

type BookingRequest = {
  id: string;
  status: string | null;
  owner_transfer_confirmed_at: string | null;
  disney_confirmation_number: string | null;
  check_in: string | null;
  check_out: string | null;
  created_at: string | null;
  lead_guest_name: string | null;
  primary_room: string | null;
  guest_total_cents: number | null;
  guest_total_cents_final: number | null;
  deposit_due: number | null;
  deposit_paid: number | null;
  deposit_currency: string | null;
  guest_profile_complete_at: string | null;
  guest_agreement_accepted_at: string | null;
  adults: number | null;
  youths: number | null;
  primary_resort: ResortRecord | null;
  confirmed_resort: ResortRecord | null;
};

type ProfileRow = {
  display_name: string | null;
  full_name: string | null;
  email: string | null;
};

type TripSwitcherRow = {
  id: string;
  check_in: string | null;
  check_out: string | null;
  primary_resort: ResortRecord | null;
  confirmed_resort: ResortRecord | null;
};

type MatchRow = {
  id: string;
  rental?: { id: string | null; dvc_confirmation_number: string | null; disney_confirmation_number: string | null } | null;
};

type RentalRow = {
  id: string;
  dvc_confirmation_number: string | null;
  disney_confirmation_number: string | null;
};
type ReadyStayLinkRow = {
  rental_id: string | null;
};

type EnhanceItem = {
  title: string;
  body: string;
  cta: string;
  href: string;
  bgImageUrl: string;
  isAvailable: boolean;
};

function buildEnhanceItems(): EnhanceItem[] {
  return [
    {
      title: "Concierge",
      body: "Priority help for dining, tickets, and special arrangements.",
      cta: "Explore",
      href: "/services/concierge",
      bgImageUrl:
        "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/concierge.png",
      isAvailable: false,
    },
    {
      title: "Dining",
      body: "Guides and planning support for an easier trip.",
      cta: "View guide",
      href: "/services/dining",
      bgImageUrl:
        "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/dining-plan.png",
      isAvailable: false,
    },
    {
      title: "Grocery delivery",
      body: "Arrive to a stocked villa—simple, organized, stress-free.",
      cta: "Arrange delivery",
      href: "/services/grocery",
      bgImageUrl:
        "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/grocery%20delivery.png",
      isAvailable: true,
    },
    {
      title: "Resort guide",
      body: "Your stay essentials, tips, and what to do next.",
      cta: "Explore guide",
      href: "/guides",
      bgImageUrl:
        "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/resort-guide.png",
      isAvailable: true,
    },
    {
      title: "Special requests",
      body: "Celebrations, room notes, accessibility needs, and more.",
      cta: "Make a request",
      href: "/guest",
      bgImageUrl:
        "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/concierge.png",
      isAvailable: true,
    },
    {
      title: "Tickets",
      body: "Theme park tickets and planning support.",
      cta: "Explore",
      href: "/services/tickets",
      bgImageUrl:
        "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/Disney%20tickets.png",
      isAvailable: false,
    },
  ];
}

export default async function TripDetailsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const adminClient = getSupabaseAdminClient();
  const isAdmin = isAdminEmailStrict(user.email);
  const dataClient = isAdmin && adminClient ? adminClient : supabase;
  const relationClient = adminClient ?? dataClient;

  let bookingQuery = dataClient
    .from("booking_requests")
    .select(
      `
      id,
      status,
      owner_transfer_confirmed_at,
      disney_confirmation_number,
      check_in,
      check_out,
      created_at,
      lead_guest_name,
      primary_room,
      guest_total_cents,
      guest_total_cents_final,
      deposit_due,
      deposit_paid,
      deposit_currency,
      guest_profile_complete_at,
      guest_agreement_accepted_at,
      adults,
      youths,
      primary_resort:resorts!booking_requests_primary_resort_id_fkey(name, slug, calculator_code),
      confirmed_resort:resorts!booking_requests_confirmed_resort_id_fkey(name, slug, calculator_code)
    `
    )
    .eq("id", tripId);

  if (!isAdmin) {
    bookingQuery = bookingQuery.eq("renter_id", user.id);
  }

  const { data: bookingRequest, error } = await bookingQuery.maybeSingle<BookingRequest>();

  if (error) {
    // Avoid leaking details to user; surface 404-ish UX.
    notFound();
  }
  if (!bookingRequest) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, full_name, email")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const { data: switcherRows } = await dataClient
    .from("booking_requests")
    .select(
      `
      id,
      check_in,
      check_out,
      primary_resort:resorts!booking_requests_primary_resort_id_fkey(name, slug, calculator_code),
      confirmed_resort:resorts!booking_requests_confirmed_resort_id_fkey(name, slug, calculator_code)
    `,
    )
    .eq("renter_id", user.id)
    .order("created_at", { ascending: false });

  const { data: contract } = await relationClient
    .from("contracts")
    .select("id, status, guest_accept_token, guest_accepted_at, signed_at, snapshot")
    .eq("booking_request_id", tripId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<GuestTripOperationsContract>();

  const { data: matchRow } = await relationClient
    .from("booking_matches")
    .select("id, rental:rentals!rentals_match_id_fkey(id, dvc_confirmation_number, disney_confirmation_number)")
    .eq("booking_id", tripId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<MatchRow>();

  const { data: matchRows } = await relationClient
    .from("booking_matches")
    .select("id")
    .eq("booking_id", tripId)
    .order("created_at", { ascending: false });

  const matchIds = (matchRows ?? []).map((row) => row.id).filter(Boolean);
  let rentalConfirmation: string | null = null;
  let rentalsData: RentalRow[] | null = null;

  if (matchIds.length > 0) {
    const { data: rentals } = await relationClient
      .from("rentals")
      .select("id, dvc_confirmation_number, disney_confirmation_number")
      .in("match_id", matchIds);

    rentalsData = rentals as RentalRow[] | null;
    rentalConfirmation =
      rentalsData?.find((row) => row.disney_confirmation_number)?.disney_confirmation_number ??
      rentalsData?.find((row) => row.dvc_confirmation_number)?.dvc_confirmation_number ??
      null;
  }

  let rentalByIdConfirmation: string | null = null;
  const snapshotRentalId =
    (contract?.snapshot as { rentalId?: string } | null)?.rentalId ?? null;
  if (snapshotRentalId) {
    const { data: rentalById } = await relationClient
      .from("rentals")
      .select("id, disney_confirmation_number, dvc_confirmation_number")
      .eq("id", snapshotRentalId)
      .maybeSingle<RentalRow>();
    rentalByIdConfirmation =
      rentalById?.disney_confirmation_number ??
      rentalById?.dvc_confirmation_number ??
      null;
  }

  const { data: readyStayLink } = await relationClient
    .from("ready_stays")
    .select("rental_id")
    .or(`booking_request_id.eq.${tripId},sold_booking_request_id.eq.${tripId}`)
    .limit(1)
    .maybeSingle<ReadyStayLinkRow>();

  let readyStayRentalConfirmation: string | null = null;
  if (readyStayLink?.rental_id) {
    const { data: readyStayRental } = await relationClient
      .from("rentals")
      .select("disney_confirmation_number, dvc_confirmation_number")
      .eq("id", readyStayLink.rental_id)
      .maybeSingle<RentalRow>();
    readyStayRentalConfirmation =
      readyStayRental?.disney_confirmation_number ??
      readyStayRental?.dvc_confirmation_number ??
      null;
  }

  if (process.env.NODE_ENV !== "production") {
    const matchCount = matchRows?.length ?? 0;
    const rentalsCount = rentalsData?.length ?? 0;
    const snapshotConfirmation = (contract?.snapshot as { confirmationNumber?: string } | null)?.confirmationNumber;
    const hasContractSnapshot = Boolean(snapshotConfirmation);
    const hasMatchRental = Boolean(matchRow?.rental?.dvc_confirmation_number);
    const hasAnyRental = Boolean(rentalsData?.some((row) => Boolean(row.dvc_confirmation_number)));

    console.info("[my-trip] confirmation lookup", {
      tripId,
      booking_request_id: bookingRequest.id,
      booking_matches: matchCount,
      rentals: rentalsCount,
      has_contract_snapshot_confirmation: hasContractSnapshot,
      has_match_rental_confirmation: hasMatchRental,
      has_any_rental_confirmation: hasAnyRental,
    });
  }

  const snapshotConfirmation =
    (contract?.snapshot as { confirmationNumber?: string } | null)?.confirmationNumber ?? null;

  const confirmationNumber =
    bookingRequest.disney_confirmation_number ??
    snapshotConfirmation ??
    readyStayRentalConfirmation ??
    rentalByIdConfirmation ??
    matchRow?.rental?.disney_confirmation_number ??
    matchRow?.rental?.dvc_confirmation_number ??
    rentalConfirmation ??
    null;
  const transferConfirmed =
    Boolean(bookingRequest.owner_transfer_confirmed_at) || bookingRequest.status === "transferred";
  const isReadyStayTrip = Boolean(readyStayLink);
  const readyStayTransferConfirmed = Boolean(bookingRequest.owner_transfer_confirmed_at);
  const readyStayDisplayConfirmationNumber = readyStayTransferConfirmed
    ? bookingRequest.disney_confirmation_number ?? confirmationNumber
    : null;
  const displayConfirmationNumber = transferConfirmed ? confirmationNumber : null;

  const resortRecord =
    bookingRequest.confirmed_resort ?? bookingRequest.primary_resort ?? null;

  const tripSwitcherItems: GuestTripSwitcherItem[] = ((switcherRows as TripSwitcherRow[] | null) ?? [])
    .filter((row) => row.id)
    .map((row) => {
      const rowResort = row.confirmed_resort ?? row.primary_resort ?? null;
      return {
        id: row.id,
        resortName: rowResort?.name ?? "Your Disney villa stay",
        dateRangeLabel: formatDateRange(row.check_in, row.check_out),
        href: `/my-trip/${row.id}`,
      };
    });

  const heroViewModel = buildGuestTripHeroViewModel({
    profileDisplayName: profile?.display_name ?? null,
    profileFullName: profile?.full_name ?? null,
    metadataDisplayName:
      typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null,
    metadataFullName:
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    metadataName:
      typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null,
    email: profile?.email ?? user.email ?? null,
    guestName: bookingRequest.lead_guest_name,
    tripId: bookingRequest.id,
    tripType: isReadyStayTrip ? "ready_stay" : "custom_request",
    resort: resortRecord,
    roomType: bookingRequest.primary_room,
    checkIn: bookingRequest.check_in,
    checkOut: bookingRequest.check_out,
    adults: bookingRequest.adults,
    youths: bookingRequest.youths,
    status: bookingRequest.status,
    transferConfirmed,
    confirmationNumber,
  });

  const { data: bookingTransactions, error: bookingTransactionsError } = await relationClient
    .from("transactions")
    .select("id, direction, txn_type, amount_cents, currency, status, paid_at, created_at")
    .eq("booking_request_id", tripId)
    .order("created_at", { ascending: false });

  let matchTransactions: GuestTripOperationsTransaction[] = [];
  let matchTransactionsError = null;
  if (matchIds.length > 0) {
    const result = await relationClient
      .from("transactions")
      .select("id, direction, txn_type, amount_cents, currency, status, paid_at, created_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false });
    matchTransactions = (result.data as GuestTripOperationsTransaction[] | null) ?? [];
    matchTransactionsError = result.error;
  }

  const { data: travelers } = await relationClient
    .from("booking_request_guests")
    .select("first_name, last_name, age_category")
    .eq("booking_id", tripId);

  const rentalIds = Array.from(
    new Set(
      [
        ...((rentalsData ?? []).map((row) => row.id).filter(Boolean)),
        readyStayLink?.rental_id,
        snapshotRentalId,
        matchRow?.rental?.id,
      ].filter(Boolean) as string[],
    ),
  );

  let tripDocuments: GuestTripOperationsDocument[] = [];
  if (rentalIds.length > 0) {
    const { data: documents } = await relationClient
      .from("rental_documents")
      .select("id, type, created_at, meta")
      .in("rental_id", rentalIds)
      .order("created_at", { ascending: false });
    tripDocuments = (documents as GuestTripOperationsDocument[] | null) ?? [];
  }

  const operationsViewModel = buildGuestTripOperationsViewModel({
    tripId: bookingRequest.id,
    tripType: isReadyStayTrip ? "ready_stay" : "custom_request",
    booking: bookingRequest,
    contract,
    transactions: [
      ...((bookingTransactions as GuestTripOperationsTransaction[] | null) ?? []),
      ...matchTransactions,
    ],
    travelers: (travelers as GuestTripOperationsTraveler[] | null) ?? [],
    documents: tripDocuments,
    paymentDataUnavailable: Boolean(bookingTransactionsError || matchTransactionsError),
  });

  const enhanceItems = buildEnhanceItems();
  const tripConfirmationNumber = isReadyStayTrip ? readyStayDisplayConfirmationNumber : displayConfirmationNumber;
  const confirmationAvailable = Boolean(tripConfirmationNumber);

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#10224A]">
      <GuestTopBar currentTripId={bookingRequest.id} trips={tripSwitcherItems} />
      <GuestTripHero trip={heroViewModel} />

      <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10 lg:px-12">
      <section aria-labelledby="reservation-progress-title" className="border-y border-[#10224A]/12 py-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="text-sm text-[#10224A]/50">Trip details</p>
            <h2 id="reservation-progress-title" className="mt-2 text-3xl font-semibold tracking-normal text-[#10224A]">
              Your reservation
            </h2>
          </div>
          <div className="divide-y divide-[#10224A]/10">
            <div className="grid gap-3 py-5 first:pt-0 sm:grid-cols-[0.7fr_1.3fr]">
              <p className="font-semibold text-[#10224A]">Reservation</p>
              <div>
                <p className="text-[#10224A]/78">
                  {transferConfirmed ? "Reservation confirmed" : "Reservation details are being finalized"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#10224A]/54">
                  {transferConfirmed
                    ? "The owner transfer has been recorded for this trip."
                    : "We will keep the reservation details here as the transfer is completed."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 py-5 sm:grid-cols-[0.7fr_1.3fr]">
              <p className="font-semibold text-[#10224A]">Disney confirmation</p>
              <div>
                {confirmationAvailable ? (
                  <div className="flex flex-col items-start gap-2">
                    <ConfirmationCopy confirmationNumber={tripConfirmationNumber} />
                  </div>
                ) : (
                  <>
                    <p className="text-[#10224A]/78">Waiting for transfer</p>
                    <p className="mt-1 text-sm leading-6 text-[#10224A]/54">
                      Your confirmation number will appear here when the transfer is complete.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-3 py-5 last:pb-0 sm:grid-cols-[0.7fr_1.3fr]">
              <p className="font-semibold text-[#10224A]">My Disney Experience</p>
              <div>
                <p className="text-[#10224A]/78">
                  {confirmationAvailable ? "Ready to link" : "Available after confirmation"}
                </p>
                <Link
                  href="/guides/link-to-disney-experience"
                  className="mt-2 inline-flex min-h-10 items-center border-b border-[#C49A3A] pb-0.5 text-sm font-semibold text-[#10224A] transition hover:border-[#10224A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C49A3A]"
                >
                  How to link your reservation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GuestTripOperations operations={operationsViewModel} />

      <section className="border-b border-[#10224A]/12 py-7">
        <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
          <h2 className="text-2xl font-semibold tracking-normal text-[#10224A]">If plans change</h2>
          <div>
            <p className="max-w-2xl text-sm leading-7 text-[#10224A]/62">
              This reservation may be eligible for a Deferred Cancellation Credit.
            </p>
            <Link
              href="/policies/deferred-cancellation"
              className="mt-2 inline-flex min-h-10 items-center border-b border-[#C49A3A] pb-0.5 text-sm font-semibold text-[#10224A] transition hover:border-[#10224A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C49A3A]"
            >
              Review cancellation policy
            </Link>
          </div>
        </div>
      </section>

      {/* ENHANCE YOUR STAY */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#0B1B3A]/85">Enhance your stay</h2>
            <p className="mt-1 text-xs text-[#0B1B3A]/55">Concierge recommendations</p>
          </div>
          <Link
            href="/services"
            className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0B1B3A]/60 hover:text-[#0B1B3A]"
          >
            View all
          </Link>
        </div>

        <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory">
          {enhanceItems.map((item) => (
            <div
              key={item.title}
              title={
                item.isAvailable
                  ? undefined
                  : "This feature is currently in development and will be available soon."
              }
              aria-disabled={!item.isAvailable}
              className={`group/soon relative min-w-[260px] snap-start overflow-hidden rounded-xl border border-[#0B1B3A]/10 bg-white ${
                item.isAvailable
                  ? "transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#0B1B3A]/15"
                  : "cursor-default opacity-75"
              }`}
            >
              {!item.isAvailable ? <ComingSoonOverlay /> : null}
              <div className="relative flex min-h-[320px] flex-col">
                {/* Top navy block */}
                <div className="relative overflow-hidden rounded-t-2xl bg-[#071a33]">
                  <div
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{
                      background:
                        "radial-gradient(140% 120% at 0% 0%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0.00) 65%)",
                    }}
                  />
                  <div className="relative z-20 flex w-full flex-col justify-between px-5 pb-4 pt-5 text-white">
                    <div>
                      <div className="text-base font-semibold text-white">{item.title}</div>
                      <p className="mt-2 text-xs leading-relaxed text-white/75">{item.body}</p>
                    </div>
                    {item.isAvailable ? (
                      <span className="mt-4 inline-flex items-center rounded-full border border-white/30 px-2.5 py-1 text-[0.7rem] font-semibold text-white/90 transition group-hover/soon:border-white/50 group-hover/soon:text-white">
                        {item.cta}
                      </span>
                    ) : (
                      <span className="mt-4 inline-flex items-center rounded-full border border-white/20 px-2.5 py-1 text-[0.7rem] font-semibold text-white/70">
                        {item.cta}
                      </span>
                    )}
                  </div>
                </div>

                {/* Image area */}
                <div className="relative h-[180px] w-full">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{ backgroundImage: `url('${item.bgImageUrl}')` }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute -top-[5px] inset-x-0 bottom-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(7,26,51,0.90) 0%, rgba(7,26,51,0.70) 35%, rgba(7,26,51,0.32) 55%, rgba(7,26,51,0.00) 70%)",
                    }}
                    aria-hidden="true"
                  />
                </div>
              </div>
              {item.isAvailable ? (
                <Link href={item.href} className="absolute inset-0 z-20" aria-label={item.title} />
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Link
            href="/services/catalog"
            className="inline-flex items-center rounded-full border border-[#0B1B3A]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B1B3A]/70 hover:border-[#0B1B3A]/30 hover:text-[#0B1B3A]"
          >
            Service catalog
          </Link>
        </div>
      </section>
      </main>
    </div>
  );
}

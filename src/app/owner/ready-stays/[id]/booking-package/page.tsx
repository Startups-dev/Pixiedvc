import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import MilestoneStepper from "@/components/owner/MilestoneStepper";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { confirmReadyStayTransfer } from "../../actions";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatPhone(value: string | null | undefined) {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return value;
}

function formatCurrencyFromCents(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

function formatRatePerPoint(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `$${(value / 100).toFixed(2)}/pt`;
}

function normalizeToken(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\.+$/, "").toLowerCase();
}

function parseLeadNameParts(input: {
  fullName: string | null;
  title: string | null;
  middleInitial: string | null;
  suffix: string | null;
}) {
  const fullName = (input.fullName ?? "").trim();
  if (!fullName) {
    return {
      title: input.title ?? null,
      firstName: null,
      middleInitial: input.middleInitial ?? null,
      lastName: null,
      suffix: input.suffix ?? null,
    };
  }

  const knownTitles = new Set(["mr", "mrs", "ms", "miss", "master", "dr"]);
  const knownSuffixes = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);
  const tokens = fullName.split(/\s+/).filter(Boolean);

  let title = input.title?.trim() || null;
  let suffix = input.suffix?.trim() || null;
  let middleInitial = input.middleInitial?.trim() || null;

  if (tokens.length) {
    const firstToken = normalizeToken(tokens[0]);
    if (title && firstToken === normalizeToken(title)) {
      tokens.shift();
    } else if (!title && knownTitles.has(firstToken)) {
      title = tokens.shift() ?? null;
    }
  }

  if (tokens.length) {
    const lastToken = normalizeToken(tokens[tokens.length - 1]);
    if (suffix && lastToken === normalizeToken(suffix)) {
      tokens.pop();
    } else if (!suffix && knownSuffixes.has(lastToken)) {
      suffix = tokens.pop() ?? null;
    }
  }

  if (tokens.length >= 3) {
    const middleIndex = 1;
    const middleToken = tokens[middleIndex] ?? "";
    const middleNorm = normalizeToken(middleToken);
    if (middleInitial && middleNorm === normalizeToken(middleInitial)) {
      tokens.splice(middleIndex, 1);
    } else if (!middleInitial && /^[a-z]$/i.test(middleNorm)) {
      middleInitial = middleNorm.toUpperCase();
      tokens.splice(middleIndex, 1);
    }
  }

  return {
    title,
    firstName: tokens[0] ?? null,
    middleInitial,
    lastName: tokens.slice(1).join(" ") || null,
    suffix,
  };
}

function formatLeadGuestName(input: {
  fullName: string | null;
  title: string | null;
  middleInitial: string | null;
  suffix: string | null;
}) {
  const parts = parseLeadNameParts(input);
  const middleToken = parts.middleInitial
    ? `${parts.middleInitial.replace(/\.+$/, "")}.`
    : null;
  const assembled = [parts.title, parts.firstName, middleToken, parts.lastName, parts.suffix]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return assembled || (input.fullName ?? "—");
}

function formatGuestAddress(bookingRequest: {
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}) {
  const cityLine = [bookingRequest.city, bookingRequest.state, bookingRequest.postal_code].filter(Boolean).join(" ");
  const parts = [bookingRequest.address_line1, cityLine, bookingRequest.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function toDateStart(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function renderGuardError(title: string, detail: string) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <Card className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Ready stays</p>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{detail}</p>
        </div>
        <Link href="/owner/ready-stays" className="text-sm font-semibold text-brand hover:underline">
          Back to Ready Stays
        </Link>
      </Card>
    </div>
  );
}

export default async function OwnerReadyStayBookingPackagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ bookingId?: string; notice?: string; error?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const bookingIdFromQuery =
    typeof resolvedSearchParams.bookingId === "string" && resolvedSearchParams.bookingId.length > 0
      ? resolvedSearchParams.bookingId
      : null;
  const noticeParam = typeof resolvedSearchParams.notice === "string" ? resolvedSearchParams.notice : null;
  const errorParam = typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/owner/ready-stays/${id}/booking-package`);
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return renderGuardError("Booking package unavailable", "admin_client_unavailable");
  }

  const { data: ownerRecord } = await adminClient
    .from("owners")
    .select("id, user_id")
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  const ownerIds = Array.from(
    new Set(
      [user.id, ownerRecord?.id ?? null, ownerRecord?.user_id ?? null].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      ),
    ),
  );

  const { data: readyStay } = await adminClient
    .from("ready_stays")
    .select(
      "id, owner_id, rental_id, status, check_in, check_out, room_type, points, owner_price_per_point_cents, booking_request_id, sold_booking_request_id, resorts(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!readyStay) {
    return renderGuardError("Ready Stay not found", `ready_stay_missing id=${id}`);
  }

  if (!ownerIds.includes(readyStay.owner_id)) {
    let ownerMatches = false;
    const { data: stayOwner } = await adminClient
      .from("owners")
      .select("id, user_id")
      .eq("id", readyStay.owner_id)
      .maybeSingle();
    if (stayOwner && ownerIds.includes(stayOwner.user_id)) {
      ownerMatches = true;
    }
    if (!ownerMatches) {
      return renderGuardError("Access denied", `owner_mismatch readyStayOwner=${readyStay.owner_id}`);
    }
  }

  const bookingIdCandidates = Array.from(
    new Set(
      [bookingIdFromQuery, readyStay?.sold_booking_request_id ?? null, readyStay?.booking_request_id ?? null].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      ),
    ),
  );

  if (!bookingIdCandidates.length) {
    return renderGuardError("Booking package missing", "booking_id_missing");
  }

  const bookingSelectBase =
    "id, status, paid_at, owner_transfer_confirmed_at, check_in, check_out, primary_room, total_points, adults, youths, guest_rate_per_point_cents, guest_total_cents, lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, city, state, postal_code, country, comments";
  const bookingSelectWithNameParts =
    `${bookingSelectBase}, lead_guest_title, lead_guest_middle_initial, lead_guest_suffix`;

  let bookingRequests: Array<Record<string, unknown>> = [];
  const bookingWithPartsResult = await adminClient
    .from("booking_requests")
    .select(bookingSelectWithNameParts)
    .in("id", bookingIdCandidates);

  if (bookingWithPartsResult.error) {
    const message = bookingWithPartsResult.error.message ?? "";
    const missingLeadNameParts =
      message.includes("lead_guest_title") ||
      message.includes("lead_guest_middle_initial") ||
      message.includes("lead_guest_suffix");

    if (!missingLeadNameParts) {
      return renderGuardError("Booking request query failed", `booking_query_error ${message}`);
    }

    const bookingFallbackResult = await adminClient
      .from("booking_requests")
      .select(bookingSelectBase)
      .in("id", bookingIdCandidates);

    if (bookingFallbackResult.error) {
      return renderGuardError("Booking request query failed", `booking_query_fallback_error ${bookingFallbackResult.error.message ?? ""}`);
    }

    bookingRequests = bookingFallbackResult.data ?? [];
  } else {
    bookingRequests = bookingWithPartsResult.data ?? [];
  }

  const bookingRequestById = new Map(
    (bookingRequests ?? [])
      .map((row) => {
        const rowId = typeof row.id === "string" ? row.id : null;
        return rowId ? [rowId, row] : null;
      })
      .filter((entry): entry is [string, Record<string, unknown>] => Boolean(entry)),
  );
  const bookingRequest =
    bookingIdCandidates.map((idCandidate) => bookingRequestById.get(idCandidate) ?? null).find(Boolean) ?? null;

  if (!bookingRequest) {
    return renderGuardError("Booking request not found", `booking_missing candidates=${bookingIdCandidates.join(",")}`);
  }

  const { data: bookingGuests } = await adminClient
    .from("booking_request_guests")
    .select("title, first_name, last_name, age_category, age, created_at")
    .eq("booking_id", bookingRequest.id)
    .order("created_at", { ascending: true });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkInDate = toDateStart(bookingRequest.check_in ?? readyStay?.check_in ?? null);
  const checkOutDate = toDateStart(bookingRequest.check_out ?? readyStay?.check_out ?? null);
  const transferComplete = Boolean(bookingRequest.owner_transfer_confirmed_at);
  const guestPaid = Boolean(
    bookingRequest.paid_at ||
      (bookingRequest.status &&
        ["paid_waiting_owner_transfer", "transferred"].includes(bookingRequest.status)),
  );

  const readyStayMilestones = [
    {
      code: "ready_stay_listing_live",
      status: ["active", "sold"].includes(readyStay.status ?? "") ? "completed" : "pending",
      occurred_at: ["active", "sold"].includes(readyStay.status ?? "") ? readyStay.check_in ?? null : null,
    },
    {
      code: "ready_stay_guest_paid",
      status: guestPaid ? "completed" : "pending",
      occurred_at: guestPaid ? bookingRequest.paid_at ?? null : null,
    },
    {
      code: "ready_stay_transfer_required",
      status: transferComplete ? "completed" : "pending",
      occurred_at: transferComplete ? bookingRequest.owner_transfer_confirmed_at ?? null : null,
    },
    {
      code: "ready_stay_confirmation_released",
      status: transferComplete ? "completed" : "pending",
      occurred_at: transferComplete ? bookingRequest.owner_transfer_confirmed_at ?? null : null,
    },
    {
      code: "ready_stay_check_in",
      status: checkInDate && today >= checkInDate ? "completed" : "pending",
      occurred_at: checkInDate && today >= checkInDate ? checkInDate.toISOString() : null,
    },
    {
      code: "ready_stay_check_out",
      status: checkOutDate && today > checkOutDate ? "completed" : "pending",
      occurred_at: checkOutDate && today > checkOutDate ? checkOutDate.toISOString() : null,
    },
  ];

  const readyStayMilestoneSteps = [
    { code: "ready_stay_listing_live", label: "Listing live" },
    { code: "ready_stay_guest_paid", label: "Guest paid" },
    { code: "ready_stay_transfer_required", label: "Transfer required" },
    { code: "ready_stay_confirmation_released", label: "Confirmation released" },
    { code: "ready_stay_check_in", label: "Check-in" },
    { code: "ready_stay_check_out", label: "Check-out" },
  ];

  const leadGuestDisplay = formatLeadGuestName({
    fullName: bookingRequest.lead_guest_name,
    title: bookingRequest.lead_guest_title ?? null,
    middleInitial: bookingRequest.lead_guest_middle_initial ?? null,
    suffix: bookingRequest.lead_guest_suffix ?? null,
  });

  const parsedLead = parseLeadNameParts({
    fullName: bookingRequest.lead_guest_name,
    title: bookingRequest.lead_guest_title ?? null,
    middleInitial: bookingRequest.lead_guest_middle_initial ?? null,
    suffix: bookingRequest.lead_guest_suffix ?? null,
  });

  const normalizeGuestKey = (parts: { title?: string | null; first?: string | null; last?: string | null }) =>
    `${normalizeToken(parts.title)}|${normalizeToken(parts.first)}|${normalizeToken(parts.last)}`;

  const leadGuestKey = normalizeGuestKey({
    title: parsedLead.title,
    first: parsedLead.firstName,
    last: parsedLead.lastName,
  });

  let leadRemoved = false;
  const additionalGuestLines = (bookingGuests ?? [])
    .filter((guest) => {
      if (leadRemoved) return true;
      const key = normalizeGuestKey({
        title: guest.title,
        first: guest.first_name,
        last: guest.last_name,
      });
      if (key === leadGuestKey) {
        leadRemoved = true;
        return false;
      }
      return true;
    })
    .map((guest) => {
      const baseName = [guest.title, guest.first_name, guest.last_name].filter(Boolean).join(" ").trim() || "—";
      if (guest.age_category === "youth") {
        return `${baseName} — Age ${typeof guest.age === "number" ? guest.age : "—"}`;
      }
      return baseName;
    });

  const partyGuestLines = [leadGuestDisplay, ...additionalGuestLines].filter(Boolean);
  const adultsCount =
    typeof bookingRequest.adults === "number"
      ? bookingRequest.adults
      : 1 + (bookingGuests ?? []).filter((guest) => guest.age_category !== "youth").length;
  const youthsCount =
    typeof bookingRequest.youths === "number"
      ? bookingRequest.youths
      : (bookingGuests ?? []).filter((guest) => guest.age_category === "youth").length;
  const partySize = `${adultsCount} adult${adultsCount === 1 ? "" : "s"} · ${youthsCount} kid${youthsCount === 1 ? "" : "s"}`;
  const specialOccasionRaw = (bookingRequest.comments ?? "").trim();
  const specialOccasionText = specialOccasionRaw
    ? specialOccasionRaw
        .split(/\s+/)
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(" ")
    : null;
  const pointsRequired =
    typeof readyStay.points === "number"
      ? readyStay.points
      : typeof bookingRequest.total_points === "number"
        ? bookingRequest.total_points
        : null;

  let ownerRatePerPointCents =
    typeof readyStay.owner_price_per_point_cents === "number" ? readyStay.owner_price_per_point_cents : null;

  if (ownerRatePerPointCents === null && readyStay.rental_id) {
    const { data: rentalRateRow } = await adminClient
      .from("rentals")
      .select("owner_rate_per_point_cents")
      .eq("id", readyStay.rental_id)
      .maybeSingle();
    ownerRatePerPointCents =
      rentalRateRow && typeof rentalRateRow.owner_rate_per_point_cents === "number"
        ? rentalRateRow.owner_rate_per_point_cents
        : null;
  }

  if (ownerRatePerPointCents === null && process.env.NODE_ENV !== "production") {
    console.warn("[owner-ready-stay-booking-package] owner rate missing", {
      readyStayId: readyStay.id,
      rentalId: readyStay.rental_id,
      bookingRequestId: bookingRequest.id,
    });
  }

  const ownerPayoutCents =
    typeof pointsRequired === "number" && typeof ownerRatePerPointCents === "number"
      ? pointsRequired * ownerRatePerPointCents
      : 0;
  const roomType = bookingRequest.primary_room ?? readyStay.room_type ?? "Pending";
  const isReadyStayContext = Boolean(
    bookingIdFromQuery ?? readyStay?.sold_booking_request_id ?? readyStay?.booking_request_id,
  );
  const showAlreadyTransferredNotice = noticeParam === "already_transferred";
  const showTransferredNotice = noticeParam === "transferred";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <Link href="/owner/ready-stays" className="text-xs uppercase tracking-[0.3em] text-muted">
          ← Back to Ready Stays
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-ink">{readyStay.resorts?.name ?? "Ready Stay"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">
                {formatDate(bookingRequest.check_in ?? readyStay.check_in ?? null)}
              </span>
              <span className="text-slate-400">→</span>
              <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-rose-700">
                {formatDate(bookingRequest.check_out ?? readyStay.check_out ?? null)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Milestones</p>
          <MilestoneStepper
            milestones={readyStayMilestones}
            steps={readyStayMilestoneSteps}
            pendingTextByCode={{ ready_stay_transfer_required: "Action required" }}
          />
        </Card>
        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Booking package</p>
          <div className="space-y-2 text-sm text-muted">
            <div className="flex items-center justify-between">
              <span>Dates</span>
              <span className="font-semibold text-ink">
                {formatDate(bookingRequest.check_in ?? readyStay.check_in ?? null)} –{" "}
                {formatDate(bookingRequest.check_out ?? readyStay.check_out ?? null)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Room type</span>
              <span className="font-semibold text-ink">{roomType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Lead guest</span>
              <span className="font-semibold text-ink">{leadGuestDisplay}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Guest email</span>
              <span className="font-semibold text-ink">{bookingRequest.lead_guest_email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Guest phone</span>
              <span className="font-semibold text-ink">{formatPhone(bookingRequest.lead_guest_phone)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Party size</span>
              <span className="font-semibold text-ink">{partySize}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span>Party guests</span>
              <div className="space-y-1 text-right font-semibold text-ink">
                {partyGuestLines.length ? (
                  partyGuestLines.map((line) => <p key={line}>{line}</p>)
                ) : (
                  <p>—</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Guest address</span>
              <span className="font-semibold text-ink">{formatGuestAddress(bookingRequest)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Special Occasion</span>
              {specialOccasionText ? (
                <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {specialOccasionText}
                </span>
              ) : (
                <span className="font-semibold text-ink">—</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Points required</span>
              <span className="font-semibold text-ink">{pointsRequired ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Rate</span>
              <span className="font-semibold text-ink">{formatRatePerPoint(ownerRatePerPointCents)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Owner payout</span>
              <span className="font-semibold text-ink">{formatCurrencyFromCents(ownerPayoutCents)}</span>
            </div>
            {isReadyStayContext ? (
              <details className="group mt-5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 transition-colors hover:bg-slate-50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm text-slate-700 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
                  <div className="flex flex-col">
                    <span>Ready to transfer your reservation?</span>
                    <span className="text-xs text-slate-500 group-open:hidden">Click to expand</span>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-xs text-slate-400 transition-transform duration-200 group-open:rotate-180"
                  >
                    ⌄
                  </span>
                </summary>
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Continental US Toll Free or Local Phone Numbers
                  </p>
                  <div className="mt-2 flex items-start gap-2 text-sm text-ink">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.52 19.52 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.62 2.61a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6.09 6.09l1.47-1.28a2 2 0 0 1 2.11-.45c.84.29 1.71.5 2.61.62A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <p className="font-semibold text-ink">(800) 800-9800 or (407) 566-3800 - Option 1</p>
                  </div>
                  <div className="mt-3 flex items-start gap-2">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v6l4 2" />
                    </svg>
                    <div className="text-sm text-slate-700">
                      <p className="font-semibold text-ink">Hours of Operation</p>
                      <p className="mt-1 font-semibold text-ink">Monday to Friday</p>
                      <p>9:00 AM to 9:00 PM Eastern Time</p>
                      <p className="mt-2 font-semibold text-ink">Saturday and Sunday</p>
                      <p>9:00 AM to 7:00 PM Eastern Time.</p>
                    </div>
                  </div>
                </div>
              </details>
            ) : null}
          </div>
        </Card>
      </section>

      <Card className="space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Transfer</p>
        {showTransferredNotice ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Transfer marked complete.
          </p>
        ) : null}
        {showAlreadyTransferredNotice ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            This reservation was already transferred.
          </p>
        ) : null}
        {errorParam ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
            Transfer update failed ({errorParam}).
          </p>
        ) : null}
        <form action={confirmReadyStayTransfer}>
          <input type="hidden" name="readyStayId" value={readyStay.id} />
          <input type="hidden" name="bookingId" value={bookingRequest.id} />
          {transferComplete || bookingRequest.status !== "paid_waiting_owner_transfer" ? (
            showAlreadyTransferredNotice || showTransferredNotice ? null : (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Transfer already completed.
              </p>
            )
          ) : (
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              I&apos;ve transferred this reservation
            </button>
          )}
        </form>
      </Card>
    </div>
  );
}

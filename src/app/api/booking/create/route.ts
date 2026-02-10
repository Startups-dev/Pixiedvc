import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type TripPayload = {
  resortId?: string;
  resortName?: string;
  villaType?: string;
  checkIn?: string;
  checkOut?: string;
  points?: number;
  estCash?: number;
  accessibility?: boolean;
  secondaryResortId?: string;
  tertiaryResortId?: string;
};

type GuestPayload = {
  leadTitle?: string;
  leadFirstName?: string;
  leadMiddleInitial?: string;
  leadLastName?: string;
  leadSuffix?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  referralSource?: string;
  comments?: string;
  leadGuest?: string;
  additionalGuests?: string[];
  adults?: number;
  youths?: number;
  adultGuests?: {
    title?: string;
    firstName: string;
    middleInitial?: string;
    lastName: string;
    suffix?: string;
  }[];
  childGuests?: {
    title?: string;
    firstName: string;
    middleInitial?: string;
    lastName: string;
    suffix?: string;
    age?: number | null;
  }[];
};

type AgreementPayload = {
  acceptTerms?: boolean;
  authorizeDeposit?: boolean;
  signedName?: string;
  captchaToken?: string;
  gateway?: string;
};

type BookingPayload = {
  trip?: TripPayload;
  guest?: GuestPayload;
  agreement?: AgreementPayload;
  depositAmount?: number;
  referral_code?: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toDateString(value: unknown) {
  const raw = asString(value);
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return raw;
}

function calculateNights(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return null;
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  const diff = end.getTime() - start.getTime();
  if (Number.isNaN(diff) || diff <= 0) return null;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function splitName(fullName: string) {
  const parts = fullName.split(" ").filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as BookingPayload;
    const trip = payload.trip ?? {};
    const guest = payload.guest ?? {};
    const agreement = payload.agreement ?? {};
    const estCash =
      typeof trip.estCash === "number" && Number.isFinite(trip.estCash) ? trip.estCash : null;
    const pricePerPoint =
      estCash !== null && typeof trip.points === "number" && trip.points > 0
        ? Number((trip.estCash / trip.points).toFixed(2))
        : null;
    const guestTotalCents = estCash !== null ? Math.round(estCash * 100) : null;
    const guestRatePerPointCents =
      guestTotalCents !== null && typeof trip.points === "number" && trip.points > 0
        ? Math.round(guestTotalCents / trip.points)
        : null;
    const totalPoints = asNumber(trip.points);

    const authClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = getSupabaseAdminClient();
    const supabase = adminClient ?? authClient;

    const resortIdRaw = asString(trip.resortId);
    let resortId: string | null = null;

    if (resortIdRaw) {
      if (isUuid(resortIdRaw)) {
        resortId = resortIdRaw;
      } else {
        const { data: resort } = await supabase
          .from("resorts")
          .select("id")
          .or(`calculator_code.eq.${resortIdRaw},slug.eq.${resortIdRaw}`)
          .maybeSingle();
        resortId = resort?.id ?? null;
      }
    }

    const checkIn = toDateString(trip.checkIn);
    const checkOut = toDateString(trip.checkOut);
    const nights = calculateNights(checkIn, checkOut);
    const primaryRoom = asString(trip.villaType) || null;

    const leadGuestName =
      asString(guest.leadGuest) ||
      [
        asString(guest.leadTitle),
        asString(guest.leadFirstName),
        asString(guest.leadMiddleInitial),
        asString(guest.leadLastName),
        asString(guest.leadSuffix),
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

    const adults =
      typeof guest.adults === "number" && Number.isFinite(guest.adults)
        ? guest.adults
        : 1 + (guest.adultGuests?.length ?? 0);
    const youths =
      typeof guest.youths === "number" && Number.isFinite(guest.youths)
        ? guest.youths
        : guest.childGuests?.length ?? 0;

    const nowIso = new Date().toISOString();
    const hasGuestProfile =
      Boolean(leadGuestName) &&
      Boolean(asString(guest.email)) &&
      Boolean(asString(guest.phone)) &&
      Boolean(asString(guest.address)) &&
      Boolean(asString(guest.city)) &&
      Boolean(asString(guest.region)) &&
      Boolean(asString(guest.postalCode)) &&
      Boolean(asString(guest.country));
    const agreementAccepted = Boolean(agreement.acceptTerms);

    const bookingStatus = agreement.gateway === "stripe" ? "draft" : "submitted";

    const signature = {
      renter_id: user.id,
      primary_resort_id: resortId,
      check_in: checkIn,
      check_out: checkOut,
      total_points: totalPoints,
      primary_room: primaryRoom,
    };
    const signatureComplete =
      Boolean(resortId && checkIn && checkOut && primaryRoom) &&
      typeof totalPoints === "number" &&
      totalPoints > 0;

    if (signatureComplete) {
      const activeStatuses = ["draft", "submitted", "pending_match", "pending_owner"];
      let existingQuery = supabase
        .from("booking_requests")
        .select("id, status, updated_at")
        .eq("renter_id", user.id)
        .in("status", activeStatuses)
        .order("updated_at", { ascending: false })
        .limit(1);

      existingQuery = existingQuery.eq("check_in", checkIn);
      existingQuery = existingQuery.eq("check_out", checkOut);
      existingQuery = existingQuery.eq("primary_resort_id", resortId);
      existingQuery = existingQuery.eq("total_points", totalPoints);
      existingQuery = existingQuery.eq("primary_room", primaryRoom);

      const { data: existingRows, error: existingError } = await existingQuery;
      const existing = existingRows?.[0] ?? null;
      if (existingError) {
        console.error("[booking/create] lookup failed", existingError);
      }

      if (existing?.id) {
        if (process.env.NODE_ENV !== "production") {
          console.info("[booking/create] reuse existing", {
            booking_request_id: existing.id,
            renter_id: user.id,
            status: existing.status ?? null,
            signature,
          });
        }
        return NextResponse.json({ bookingId: existing.id });
      }
    }
    const bookingInsert = {
      renter_id: user.id,
      status: bookingStatus,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      primary_resort_id: resortId,
      primary_room: primaryRoom,
      primary_view: null,
      requires_accessibility: Boolean(trip.accessibility),
      secondary_resort_id: asString(trip.secondaryResortId) || null,
      secondary_room: null,
      tertiary_resort_id: asString(trip.tertiaryResortId) || null,
      tertiary_room: null,
      adults: Number.isFinite(adults) ? adults : null,
      youths: Number.isFinite(youths) ? youths : null,
      marketing_source: asString(guest.referralSource) || null,
      comments: asString(guest.comments) || null,
      phone: asString(guest.phone) || null,
      address_line1: asString(guest.address) || null,
      address_line2: null,
      city: asString(guest.city) || null,
      state: asString(guest.region) || null,
      postal_code: asString(guest.postalCode) || null,
      country: asString(guest.country) || null,
      lead_guest_name: leadGuestName || null,
      lead_guest_email: asString(guest.email) || null,
      lead_guest_phone: asString(guest.phone) || null,
      total_points: totalPoints,
      max_price_per_point: pricePerPoint,
      est_cash: estCash,
      guest_total_cents: guestTotalCents,
      guest_rate_per_point_cents: guestRatePerPointCents,
      deposit_due: asNumber(payload.depositAmount) ?? null,
      deposit_paid: 0,
      deposit_currency: "USD",
      accepted_terms: Boolean(agreement.acceptTerms),
      accepted_insurance: Boolean(agreement.authorizeDeposit),
      guest_profile_complete_at: hasGuestProfile ? nowIso : null,
      guest_agreement_accepted_at: agreementAccepted ? nowIso : null,
      updated_at: nowIso,
      referral_code: payload.referral_code ?? null,
    };

    const { data: booking, error: bookingError } = await supabase
      .from("booking_requests")
      .insert(bookingInsert)
      .select("id")
      .single();

    if (bookingError || !booking?.id) {
      if (bookingError?.code === "23505" && signatureComplete) {
        const activeStatuses = ["draft", "submitted", "pending_match", "pending_owner"];
        let retryQuery = supabase
          .from("booking_requests")
          .select("id, status, updated_at")
          .eq("renter_id", user.id)
          .in("status", activeStatuses)
          .order("updated_at", { ascending: false })
          .limit(1);

        retryQuery = retryQuery.eq("check_in", checkIn);
        retryQuery = retryQuery.eq("check_out", checkOut);
        retryQuery = retryQuery.eq("primary_resort_id", resortId);
        retryQuery = retryQuery.eq("total_points", totalPoints);
        retryQuery = retryQuery.eq("primary_room", primaryRoom);

        const { data: retryRows } = await retryQuery;
        const retryExisting = retryRows?.[0] ?? null;
        if (retryExisting?.id) {
          if (process.env.NODE_ENV !== "production") {
            console.info("[booking/create] reuse existing", {
              booking_request_id: retryExisting.id,
              renter_id: user.id,
              status: retryExisting.status ?? null,
              signature,
            });
          }
          return NextResponse.json({ bookingId: retryExisting.id });
        }
      }

      console.error("[booking/create] insert failed", bookingError);
      return NextResponse.json(
        { error: bookingError?.message ?? "Unable to create booking request." },
        { status: 400 },
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[booking/create] created new", {
        booking_request_id: booking.id,
        renter_id: user.id,
        status: bookingStatus,
        signature,
      });
    }

    const adultGuests = guest.adultGuests ?? [];
    const childGuests = guest.childGuests ?? [];
    const leadFirstName = asString(guest.leadFirstName);
    const leadMiddleInitial = asString(guest.leadMiddleInitial);
    const leadLastName = asString(guest.leadLastName);
    const leadSuffix = asString(guest.leadSuffix);
    const leadFromFull = leadFirstName || leadLastName ? null : splitName(leadGuestName);
    const leadRow =
      leadGuestName && (leadFirstName || leadLastName || (leadFromFull?.first || leadFromFull?.last))
        ? {
            booking_id: booking.id,
            title: asString(guest.leadTitle) || null,
            first_name: [leadFirstName || leadFromFull?.first || "", leadMiddleInitial].filter(Boolean).join(" "),
            last_name: [leadLastName || leadFromFull?.last || "", leadSuffix].filter(Boolean).join(" "),
            age_category: "adult",
            age: null,
          }
        : null;

    const guestRows = [
      ...(leadRow ? [leadRow] : []),
      ...adultGuests.map((row) => ({
        booking_id: booking.id,
        title: asString(row.title) || null,
        first_name: [asString(row.firstName), asString(row.middleInitial)].filter(Boolean).join(" "),
        last_name: [asString(row.lastName), asString(row.suffix)].filter(Boolean).join(" "),
        age_category: "adult",
        age: null,
      })),
      ...childGuests.map((row) => ({
        booking_id: booking.id,
        title: asString(row.title) || null,
        first_name: [asString(row.firstName), asString(row.middleInitial)].filter(Boolean).join(" "),
        last_name: [asString(row.lastName), asString(row.suffix)].filter(Boolean).join(" "),
        age_category: "youth",
        age: typeof row.age === "number" && Number.isFinite(row.age) ? row.age : null,
      })),
    ].filter((row) => row.first_name && row.last_name);

    if (guestRows.length) {
      const { error: guestError } = await supabase
        .from("booking_request_guests")
        .insert(guestRows);
      if (guestError) {
        console.error("[booking/create] guest insert failed", guestError);
      }
    }

    return NextResponse.json({ bookingId: booking.id });
  } catch (error) {
    console.error("[booking/create] unexpected error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}

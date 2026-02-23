import { NextResponse } from "next/server";

import { guestInfoSchema } from "@pixiedvc/booking-form";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { ensureGuestAgreementForBooking } from "@/server/contracts";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Booking is temporarily unavailable." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        readyStayId?: string;
        bookingId?: string;
        guest?: unknown;
      }
    | null;

  const readyStayId = body?.readyStayId;
  if (!readyStayId) {
    return NextResponse.json({ error: "Missing booking reference." }, { status: 400 });
  }

  const parsed = guestInfoSchema.safeParse(body?.guest);
  if (!parsed.success) {
    return NextResponse.json({ error: "Guest information is invalid." }, { status: 400 });
  }

  const guest = parsed.data;
  const adultGuestRows = guest.adultGuests ?? [];
  const childGuestRows = guest.childGuests ?? [];
  const derivedAdults = 1 + adultGuestRows.length;
  const derivedYouths = childGuestRows.length;
  const providedAdults =
    typeof guest.adults === "number" && Number.isFinite(guest.adults) ? guest.adults : null;
  const providedYouths =
    typeof guest.youths === "number" && Number.isFinite(guest.youths) ? guest.youths : null;
  const requestedAdults = Math.max(derivedAdults, providedAdults ?? derivedAdults);
  const requestedYouths = Math.max(derivedYouths, providedYouths ?? derivedYouths);
  const expectedAdditionalGuests = Math.max(0, requestedAdults + requestedYouths - 1);
  const providedAdditionalGuests = adultGuestRows.length + childGuestRows.length;

  if (requestedAdults < 1 || requestedYouths < 0) {
    return NextResponse.json({ error: "Guest counts are invalid." }, { status: 400 });
  }

  if (providedAdditionalGuests !== expectedAdditionalGuests) {
    return NextResponse.json(
      { error: "Please add the remaining guest names to continue." },
      { status: 400 },
    );
  }

  if (
    childGuestRows.some(
      (row) =>
        typeof row.age !== "number" ||
        !Number.isFinite(row.age) ||
        row.age < 0 ||
        row.age > 17,
    )
  ) {
    return NextResponse.json({ error: "Child age is required." }, { status: 400 });
  }

  const { data: stay } = await adminClient
    .from("ready_stays")
    .select(
      "id, owner_id, rental_id, resort_id, check_in, check_out, points, room_type, guest_price_per_point_cents, status, booking_request_id",
    )
    .eq("id", readyStayId)
    .eq("status", "active")
    .maybeSingle();

  if (!stay) {
    return NextResponse.json({ error: "Ready Stay is no longer active." }, { status: 404 });
  }

  let bookingId = stay.booking_request_id ?? null;

  if (bookingId) {
    const { data: linkedBooking } = await adminClient
      .from("booking_requests")
      .select("id, renter_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (!linkedBooking?.id || (linkedBooking.renter_id && linkedBooking.renter_id !== user.id)) {
      return NextResponse.json({ error: "Booking package not found." }, { status: 404 });
    }
  } else {
    const candidateBookingId = body?.bookingId ?? null;
    if (candidateBookingId) {
      const { data: candidateBooking } = await adminClient
        .from("booking_requests")
        .select("id, renter_id")
        .eq("id", candidateBookingId)
        .maybeSingle();
      if (candidateBooking?.id && (!candidateBooking.renter_id || candidateBooking.renter_id === user.id)) {
        bookingId = candidateBooking.id;
      }
    }
  }

  if (!bookingId) {
    const guestTotalCents = Number(stay.guest_price_per_point_cents ?? 0) * Number(stay.points ?? 0);
    const { data: createdBooking, error: createBookingError } = await adminClient
      .from("booking_requests")
      .insert({
        renter_id: user.id,
        primary_resort_id: stay.resort_id,
        check_in: stay.check_in,
        check_out: stay.check_out,
        total_points: stay.points,
        primary_room: stay.room_type,
        guest_total_cents: guestTotalCents,
        guest_rate_per_point_cents: stay.guest_price_per_point_cents,
        status: "submitted",
      })
      .select("id")
      .single();

    if (createBookingError || !createdBooking?.id) {
      return NextResponse.json({ error: createBookingError?.message ?? "Booking could not be created." }, { status: 400 });
    }
    bookingId = createdBooking.id;
  }

  const middleInitial = guest.leadMiddleInitial?.trim() ?? "";
  const middleToken = middleInitial
    ? middleInitial.endsWith(".")
      ? middleInitial
      : `${middleInitial}.`
    : "";
  const leadGuestName = [
    guest.leadTitle,
    guest.leadFirstName,
    middleToken,
    guest.leadLastName,
    guest.leadSuffix,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const adults = requestedAdults;
  const youths = requestedYouths;

  const bookingUpdateBase = {
    primary_resort_id: stay.resort_id,
    primary_room: stay.room_type,
    check_in: stay.check_in,
    check_out: stay.check_out,
    total_points: stay.points,
    guest_rate_per_point_cents: stay.guest_price_per_point_cents,
    guest_total_cents: Number(stay.points ?? 0) * Number(stay.guest_price_per_point_cents ?? 0),
    lead_guest_name: leadGuestName,
    lead_guest_email: guest.email,
    lead_guest_phone: guest.phone,
    address_line1: guest.address,
    city: guest.city,
    state: guest.region,
    postal_code: guest.postalCode,
    country: guest.country,
    marketing_source: guest.referralSource ?? null,
    comments: guest.comments ?? null,
    adults,
    youths,
    renter_id: user.id,
    updated_at: new Date().toISOString(),
  };

  const bookingUpdateWithNameParts = {
    ...bookingUpdateBase,
    lead_guest_title: guest.leadTitle?.trim() || null,
    lead_guest_middle_initial: middleInitial || null,
    lead_guest_suffix: guest.leadSuffix?.trim() || null,
  };

  const performBookingUpdate = (payload: Record<string, unknown>) =>
    adminClient
      .from("booking_requests")
      .update(payload)
      .eq("id", bookingId)
      .or(`renter_id.eq.${user.id},renter_id.is.null`);

  let { error: updateError } = await performBookingUpdate(bookingUpdateWithNameParts);

  if (updateError) {
    const message = updateError.message ?? "";
    const missingLeadNamePartColumn =
      message.includes("lead_guest_title") ||
      message.includes("lead_guest_middle_initial") ||
      message.includes("lead_guest_suffix");
    if (missingLeadNamePartColumn) {
      const fallbackResult = await performBookingUpdate(bookingUpdateBase);
      updateError = fallbackResult.error;
    }
  }

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await adminClient
    .from("ready_stays")
    .update({
      booking_request_id: bookingId,
      lock_session_id: bookingId,
      locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", readyStayId);

  await adminClient.from("booking_request_guests").delete().eq("booking_id", bookingId);

  const adultRows = adultGuestRows.map((g) => ({
    booking_id: bookingId,
    title: g.title ?? null,
    first_name: g.firstName,
    last_name: g.lastName,
    email: null,
    phone: null,
    age_category: "adult",
    age: null,
  }));

  const childRows = childGuestRows.map((g) => ({
    booking_id: bookingId,
    title: g.title ?? null,
    first_name: g.firstName,
    last_name: g.lastName,
    email: null,
    phone: null,
    age_category: "youth",
    age: g.age ?? null,
  }));

  const rows = [...adultRows, ...childRows];
  if (rows.length) {
    const { error: guestInsertError } = await adminClient.from("booking_request_guests").insert(rows);
    if (guestInsertError) {
      return NextResponse.json({ error: guestInsertError.message }, { status: 400 });
    }
  }

  let { data: ownerRecord } = await adminClient
    .from("owners")
    .select("id, user_id")
    .eq("id", stay.owner_id)
    .maybeSingle();

  if (!ownerRecord) {
    const { data: fallbackOwner } = await adminClient
      .from("owners")
      .select("id, user_id")
      .eq("user_id", stay.owner_id)
      .maybeSingle();
    ownerRecord = fallbackOwner ?? null;
  }

  if (!ownerRecord && stay.rental_id) {
    const { data: rentalOwner } = await adminClient
      .from("rentals")
      .select("owner_user_id")
      .eq("id", stay.rental_id)
      .maybeSingle();
    if (rentalOwner?.owner_user_id) {
      const { data: ownerFromRental } = await adminClient
        .from("owners")
        .select("id, user_id")
        .eq("user_id", rentalOwner.owner_user_id)
        .maybeSingle();
      ownerRecord = ownerFromRental ?? null;
    }
  }

  if (!ownerRecord) {
    return NextResponse.json({ error: "Owner record not found." }, { status: 400 });
  }

  const contract = await ensureGuestAgreementForBooking({
    supabase: adminClient,
    ownerId: ownerRecord.id,
    bookingRequestId: bookingId,
    rentalId: stay.rental_id,
  });

  if (!contract?.guestAcceptToken) {
    return NextResponse.json({ error: "Agreement could not be prepared." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    agreementPath: `/ready-stays/${readyStayId}/agreement?lock=${encodeURIComponent(bookingId)}`,
  });
}

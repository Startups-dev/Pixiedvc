import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveCalculatorCode } from "@/lib/resort-calculator";
import { computeOwnerPayout } from "@/lib/pricing";

type EnsureRentalResult = {
  rentalId: string;
  checkIn: string | null;
  ownerUserId: string;
  rentalAmountCents: number | null;
};

const RENTAL_PAYLOAD_KEYS = new Set([
  "owner_user_id",
  "guest_user_id",
  "resort_code",
  "room_type",
  "check_in",
  "check_out",
  "points_required",
  "rental_amount_cents",
  "status",
  "booking_package",
  "match_id",
  "owner_id",
  "guest_id",
  "adults",
  "youths",
  "dvc_confirmation_number",
  "disney_confirmation_number",
  "lead_guest_name",
  "lead_guest_email",
  "lead_guest_phone",
  "lead_guest_address",
]);

function pickAllowedColumns<T extends Record<string, unknown>>(payload: T) {
  const filtered: Record<string, unknown> = {};
  const removed: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (RENTAL_PAYLOAD_KEYS.has(key)) {
      filtered[key] = value;
    } else {
      removed.push(key);
    }
  }
  return { filtered, removed };
}

export async function ensureRentalForMatch(params: {
  adminClient: SupabaseClient;
  matchId: string;
}): Promise<EnsureRentalResult> {
  const { adminClient, matchId } = params;

  const { data: match } = await adminClient
    .from("booking_matches")
    .select(
      "id, booking_id, owner_id, owner_membership_id, owner_base_rate_per_point_cents, owner_premium_per_point_cents, owner_rate_per_point_cents, owner_total_cents, owner_home_resort_premium_applied",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (!match) {
    throw new Error("match_not_found");
  }

  const { data: booking } = await adminClient
    .from("booking_requests")
    .select(
      "id, renter_id, check_in, check_out, nights, primary_resort_id, primary_room, primary_view, total_points, max_price_per_point, est_cash, guest_total_cents, guest_rate_per_point_cents, adults, youths, requires_accessibility, comments, lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, address_line2, city, state, postal_code, country, deposit_due, deposit_paid, deposit_currency, guest_profile_complete_at, guest_agreement_accepted_at, primary_resort:resorts!booking_requests_primary_resort_id_fkey(slug, calculator_code, name)",
    )
    .eq("id", match.booking_id)
    .maybeSingle();

  if (!booking) {
    throw new Error("booking_not_found");
  }

  const { data: ownerRow, error: ownerErr } = await adminClient
    .from("owners")
    .select("id, user_id")
    .eq("id", match.owner_id)
    .maybeSingle();

  if (ownerErr) {
    throw new Error(ownerErr.message);
  }

  const resolvedOwnerUserId = ownerRow?.user_id ?? match.owner_id ?? null;
  if (!resolvedOwnerUserId) {
    throw new Error(`owner_user_id_missing owner_id=${match.owner_id} match_id=${match.id}`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[ensureRentalForMatch] owner resolution", {
      match_id: match.id,
      owner_id: match.owner_id,
      owner_user_id: resolvedOwnerUserId,
    });
  }

  const resortMeta = booking.primary_resort ?? null;
  const resortCode =
    resolveCalculatorCode({
      slug: resortMeta?.slug ?? null,
      calculator_code: resortMeta?.calculator_code ?? null,
    }) ?? resortMeta?.slug ?? "TBD";

  const bookingPackage = {
    booking_request_id: booking.id,
    resort_name: resortMeta?.name ?? null,
    resort_slug: resortMeta?.slug ?? null,
    resort_code: resortCode,
    room_type: booking.primary_room ?? null,
    room_view: booking.primary_view ?? null,
    check_in: booking.check_in ?? null,
    check_out: booking.check_out ?? null,
    nights: booking.nights ?? null,
    points_required: booking.total_points ?? null,
    lead_guest_name: booking.lead_guest_name ?? null,
    lead_guest_email: booking.lead_guest_email ?? null,
    lead_guest_phone: booking.lead_guest_phone ?? null,
    lead_guest_address: {
      line1: booking.address_line1 ?? null,
      line2: booking.address_line2 ?? null,
      city: booking.city ?? null,
      state: booking.state ?? null,
      postal: booking.postal_code ?? null,
      country: booking.country ?? null,
    },
    party_size:
      typeof booking.adults === "number" && typeof booking.youths === "number"
        ? booking.adults + booking.youths
        : null,
    adults: booking.adults ?? null,
    youths: booking.youths ?? null,
    requires_accessibility: booking.requires_accessibility ?? false,
    comments: booking.comments ?? null,
    deposit_due: booking.deposit_due ?? null,
    deposit_paid: booking.deposit_paid ?? null,
    deposit_currency: booking.deposit_currency ?? "USD",
    max_price_per_point: booking.max_price_per_point ?? null,
    est_cash: booking.est_cash ?? null,
    guest_total_cents: booking.guest_total_cents ?? null,
    guest_rate_per_point_cents: booking.guest_rate_per_point_cents ?? null,
  };

  let membershipResortId: string | null = null;
  if (match.owner_membership_id) {
    const { data: membership } = await adminClient
      .from("owner_memberships")
      .select("resort_id")
      .eq("id", match.owner_membership_id)
      .maybeSingle();
    membershipResortId = membership?.resort_id ?? null;
  }

  const ownerPayout = computeOwnerPayout({
    totalPoints: booking.total_points,
    matchedMembershipResortId: membershipResortId,
    bookingResortId: booking.primary_resort_id ?? null,
  });

  const owner_total_cents =
    typeof match.owner_total_cents === "number"
      ? match.owner_total_cents
      : ownerPayout.owner_total_cents;

  const fullPayload = {
    match_id: match.id,
    owner_id: match.owner_id,
    guest_id: booking.renter_id ?? null,
    owner_user_id: resolvedOwnerUserId,
    guest_user_id: booking.renter_id ?? null,
    resort_code: resortCode,
    room_type: booking.primary_room ?? null,
    check_in: booking.check_in ?? null,
    check_out: booking.check_out ?? null,
    points_required: booking.total_points ?? null,
    rental_amount_cents:
      typeof owner_total_cents === "number" && owner_total_cents > 0 ? owner_total_cents : null,
    status: "needs_dvc_booking",
    booking_package: bookingPackage,
    adults: booking.adults ?? null,
    youths: booking.youths ?? null,
    dvc_confirmation_number: null,
    disney_confirmation_number: null,
    lead_guest_name: booking.lead_guest_name ?? null,
    lead_guest_email: booking.lead_guest_email ?? null,
    lead_guest_phone: booking.lead_guest_phone ?? null,
    lead_guest_address: bookingPackage.lead_guest_address,
  };

  const { filtered: rentalPayload, removed } = pickAllowedColumns(fullPayload);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[ensureRentalForMatch] rental payload", {
      removed,
      payloadKeys: Object.keys(rentalPayload),
    });
  }

  const { data: existingRental } = await adminClient
    .from("rentals")
    .select("id, check_in, owner_user_id, rental_amount_cents")
    .eq("match_id", match.id)
    .maybeSingle();

  let rentalRow = existingRental ?? null;
  if (!rentalRow) {
    const { data: insertedRental, error: rentalError } = await adminClient
      .from("rentals")
      .insert(rentalPayload)
      .select("id, check_in, owner_user_id, rental_amount_cents")
      .single();

    if (rentalError || !insertedRental) {
      const message = rentalError?.message ?? "rental_create_failed";
      throw new Error(message);
    }
    rentalRow = insertedRental;

    const guestVerified = Boolean(
      booking.guest_profile_complete_at && booking.guest_agreement_accepted_at,
    );
    const paymentVerified =
      typeof booking.deposit_paid === "number" &&
      typeof booking.deposit_due === "number" &&
      booking.deposit_due > 0 &&
      booking.deposit_paid >= booking.deposit_due;
    const nowIso = new Date().toISOString();
    await adminClient.from("rental_milestones").insert([
      { rental_id: rentalRow.id, code: "matched", status: "completed", occurred_at: nowIso },
      {
        rental_id: rentalRow.id,
        code: "guest_verified",
        status: guestVerified ? "completed" : "pending",
        occurred_at: guestVerified ? nowIso : null,
      },
      {
        rental_id: rentalRow.id,
        code: "payment_verified",
        status: paymentVerified ? "completed" : "pending",
        occurred_at: paymentVerified ? nowIso : null,
      },
      { rental_id: rentalRow.id, code: "booking_package_sent", status: "completed", occurred_at: nowIso },
      { rental_id: rentalRow.id, code: "agreement_sent", status: "pending", occurred_at: null },
      { rental_id: rentalRow.id, code: "owner_approved", status: "pending", occurred_at: null },
      { rental_id: rentalRow.id, code: "owner_booked", status: "pending", occurred_at: null },
      { rental_id: rentalRow.id, code: "check_in", status: "pending", occurred_at: null },
      { rental_id: rentalRow.id, code: "check_out", status: "pending", occurred_at: null },
    ]);
  } else {
    await adminClient.from("rentals").update(rentalPayload).eq("id", rentalRow.id);
  }

  return {
    rentalId: rentalRow.id,
    checkIn: rentalRow.check_in ?? null,
    ownerUserId: rentalRow.owner_user_id,
    rentalAmountCents: rentalRow.rental_amount_cents ?? null,
  };
}

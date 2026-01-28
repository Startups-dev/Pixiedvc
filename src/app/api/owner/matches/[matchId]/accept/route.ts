import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { resolveCalculatorCode } from "@/lib/resort-calculator";
import { computeOwnerPayout } from "@/lib/pricing";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Service role key not configured");
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  const { data: owner } = await adminClient
    .from("owners")
    .select("id, user_id")
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  if (!owner) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 404 });
  }

  const { data: match } = await adminClient
    .from("booking_matches")
    .select("id, status, booking_id, owner_id, owner_membership_id, points_reserved, points_reserved_current, points_reserved_borrowed, created_at, expires_at, owner_base_rate_per_point_cents, owner_premium_per_point_cents, owner_rate_per_point_cents, owner_total_cents, owner_home_resort_premium_applied")
    .eq("id", matchId)
    .eq("owner_id", owner.id)
    .maybeSingle();

  if (!match) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 404 });
  }

  const now = new Date();
  const expiresAt = match.expires_at
    ? new Date(match.expires_at)
    : new Date(new Date(match.created_at).getTime() + 60 * 60 * 1000);
  const isExpired = now >= expiresAt;
  const isAlreadyAccepted = match.status === "accepted";
  const nowIso = now.toISOString();

  if (isExpired) {
    await adminClient
      .from("booking_matches")
      .update({ status: "expired", responded_at: nowIso })
      .eq("id", match.id);

    const reservedCurrent = match.points_reserved_current ?? match.points_reserved ?? 0;
    if (match.owner_membership_id && reservedCurrent) {
      const { data: membership } = await adminClient
        .from("owner_memberships")
        .select("id, points_reserved")
        .eq("id", match.owner_membership_id)
        .maybeSingle();

      if (membership) {
        const newReserved = Math.max((membership.points_reserved ?? 0) - reservedCurrent, 0);
        await adminClient
          .from("owner_memberships")
          .update({ points_reserved: newReserved })
          .eq("id", match.owner_membership_id);
      }
    }

    const reservedBorrowed = match.points_reserved_borrowed ?? 0;
    if (reservedBorrowed > 0) {
      const { data: booking } = await adminClient
        .from("booking_requests")
        .select("primary_resort_id, check_in")
        .eq("id", match.booking_id)
        .maybeSingle();

      const { data: currentMembership } = await adminClient
        .from("owner_memberships")
        .select("owner_id, resort_id, contract_year")
        .eq("id", match.owner_membership_id)
        .maybeSingle();

      const bookingYear = booking?.check_in ? new Date(booking.check_in).getUTCFullYear() : null;
      const currentYear = currentMembership?.contract_year ?? bookingYear;

      if (currentMembership?.owner_id && currentMembership?.resort_id && currentYear) {
        const { data: nextMembership } = await adminClient
          .from("owner_memberships")
          .select("id, points_reserved")
          .eq("owner_id", currentMembership.owner_id)
          .eq("resort_id", currentMembership.resort_id)
          .eq("contract_year", currentYear + 1)
          .maybeSingle();

        if (nextMembership) {
          const newReserved = Math.max((nextMembership.points_reserved ?? 0) - reservedBorrowed, 0);
          await adminClient
            .from("owner_memberships")
            .update({ points_reserved: newReserved })
            .eq("id", nextMembership.id);
        }
      }
    }

    await adminClient
      .from("booking_requests")
      .update({ status: "pending_match", matched_owner_id: null, updated_at: nowIso })
      .eq("id", match.booking_id);

    return NextResponse.json({ error: "expired" }, { status: 410 });
  }
  const isPending = match.status === "pending_owner" || match.status === "pending";
  if (!isPending && !isAlreadyAccepted) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 409 });
  }

  if (!isAlreadyAccepted) {
    const { error: matchUpdateError } = await adminClient
      .from("booking_matches")
      .update({ status: "accepted", responded_at: nowIso })
      .eq("id", match.id);

    if (matchUpdateError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to update match", matchUpdateError);
      }
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  }

  const { data: booking } = await adminClient
    .from("booking_requests")
    .select(
      "id, renter_id, primary_resort_id, check_in, check_out, primary_room, primary_view, total_points, max_price_per_point, est_cash, guest_total_cents, guest_rate_per_point_cents, adults, youths, requires_accessibility, comments, lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, address_line2, city, state, postal_code, country, deposit_due, deposit_paid, deposit_currency, primary_resort:resorts!booking_requests_primary_resort_id_fkey(slug, calculator_code, name)",
    )
    .eq("id", match.booking_id)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 404 });
  }

  const resortMeta = booking.primary_resort ?? null;
  const resortCode =
    resolveCalculatorCode({
      slug: resortMeta?.slug ?? null,
      calculator_code: resortMeta?.calculator_code ?? null,
    }) ?? "TBD";

  const resortName = resortMeta?.name ?? null;
  const guestVerified = Boolean(
    booking.renter_id ||
      (booking.lead_guest_name && booking.lead_guest_email && booking.lead_guest_phone),
  );
  const paymentVerified =
    typeof booking.deposit_paid === "number" && booking.deposit_paid >= 99;
  const bookingPackage = {
    booking_request_id: booking.id,
    resort_name: resortName,
    resort_code: resortCode,
    room_type: booking.primary_room ?? null,
    room_view: booking.primary_view ?? null,
    check_in: booking.check_in ?? null,
    check_out: booking.check_out ?? null,
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

  const computedOwnerPayout = computeOwnerPayout({
    totalPoints: booking.total_points,
    matchedMembershipResortId: membershipResortId,
    bookingResortId: booking.primary_resort_id ?? null,
  });

  const owner_base_rate_per_point_cents =
    typeof match.owner_base_rate_per_point_cents === "number"
      ? match.owner_base_rate_per_point_cents
      : computedOwnerPayout.owner_base_rate_per_point_cents;
  const owner_premium_per_point_cents =
    typeof match.owner_premium_per_point_cents === "number"
      ? match.owner_premium_per_point_cents
      : computedOwnerPayout.owner_premium_per_point_cents;
  const owner_rate_per_point_cents =
    typeof match.owner_rate_per_point_cents === "number"
      ? match.owner_rate_per_point_cents
      : computedOwnerPayout.owner_rate_per_point_cents;
  const owner_total_cents =
    typeof match.owner_total_cents === "number"
      ? match.owner_total_cents
      : computedOwnerPayout.owner_total_cents;
  const owner_home_resort_premium_applied =
    typeof match.owner_home_resort_premium_applied === "boolean"
      ? match.owner_home_resort_premium_applied
      : computedOwnerPayout.owner_home_resort_premium_applied;

  const rentalAmountCents =
    typeof owner_total_cents === "number" && owner_total_cents > 0 ? owner_total_cents : null;

  const rentalPayload = {
    match_id: match.id,
    owner_id: owner.id,
    guest_id: booking.renter_id ?? null,
    owner_user_id: owner.user_id ?? owner.id,
    guest_user_id: booking.renter_id ?? null,
    resort_code: resortCode,
    room_type: booking.primary_room ?? null,
    check_in: booking.check_in ?? null,
    check_out: booking.check_out ?? null,
    points_required: booking.total_points ?? null,
    rental_amount_cents: rentalAmountCents,
    owner_base_rate_per_point_cents,
    owner_premium_per_point_cents,
    owner_rate_per_point_cents,
    owner_total_cents,
    owner_home_resort_premium_applied,
    status: "needs_dvc_booking",
    booking_package: bookingPackage,
    lead_guest_name: booking.lead_guest_name ?? null,
    lead_guest_email: booking.lead_guest_email ?? null,
    lead_guest_phone: booking.lead_guest_phone ?? null,
    lead_guest_address: bookingPackage.lead_guest_address,
    party_size: bookingPackage.party_size,
    adults: booking.adults ?? null,
    youths: booking.youths ?? null,
    special_needs: booking.requires_accessibility ?? false,
    special_needs_notes: booking.comments ?? null,
  };

  const { data: existingRental } = await adminClient
    .from("rentals")
    .select("id")
    .eq("match_id", match.id)
    .maybeSingle();

  let rentalRow = existingRental ?? null;
  if (!rentalRow) {
    const { data: insertedRental, error: rentalError } = await adminClient
      .from("rentals")
      .insert(rentalPayload)
      .select("id")
      .maybeSingle();

    if (rentalError || !insertedRental) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to create rental", rentalError);
      }
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
    rentalRow = insertedRental;
  } else {
    await adminClient
      .from("rentals")
      .update(rentalPayload)
      .eq("id", rentalRow.id);
  }

  if (!existingRental) {
    const { error: milestoneError } = await adminClient.from("rental_milestones").insert([
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
    if (milestoneError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to seed rental milestones", milestoneError);
      }
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  } else {
    if (guestVerified) {
      await adminClient
        .from("rental_milestones")
        .update({ status: "completed", occurred_at: nowIso })
        .eq("rental_id", rentalRow.id)
        .eq("code", "guest_verified");
    }
    if (paymentVerified) {
      await adminClient
        .from("rental_milestones")
        .update({ status: "completed", occurred_at: nowIso })
        .eq("rental_id", rentalRow.id)
        .eq("code", "payment_verified");
    }
    await adminClient
      .from("rental_milestones")
      .update({ status: "completed", occurred_at: nowIso })
      .eq("rental_id", rentalRow.id)
      .eq("code", "booking_package_sent");
  }

  const { error: bookingUpdateError } = await adminClient
    .from("booking_requests")
    .update({ status: "matched", matched_owner_id: owner.id, updated_at: nowIso })
    .eq("id", booking.id);

  if (bookingUpdateError) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to update booking request", bookingUpdateError);
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[owner/matches/accept] rental ready", {
      match_id: match.id,
      rental_id: rentalRow.id,
    });
  }

  return NextResponse.json({ rentalId: rentalRow.id });
}

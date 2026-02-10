import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { ensureRentalForMatch } from "@/lib/rentals/ensureRentalForMatch";

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
        .select("owner_id, resort_id, use_year_start")
        .eq("id", match.owner_membership_id)
        .maybeSingle();

      const currentStart = currentMembership?.use_year_start ?? null;
      if (currentMembership?.owner_id && currentMembership?.resort_id && currentStart) {
        const nextStart = new Date(currentStart);
        if (Number.isNaN(nextStart.getTime())) {
          return NextResponse.json({ error: "expired" }, { status: 410 });
        }
        nextStart.setUTCFullYear(nextStart.getUTCFullYear() + 1);
        const nextISO = nextStart.toISOString().slice(0, 10);
        const { data: nextMembership } = await adminClient
          .from("owner_memberships")
          .select("id, points_reserved")
          .eq("owner_id", currentMembership.owner_id)
          .eq("resort_id", currentMembership.resort_id)
          .eq("use_year_start", nextISO)
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

    const { error: expiredBookingError } = await adminClient
      .from("booking_requests")
      .update({ status: "pending_match", updated_at: nowIso })
      .eq("id", match.booking_id);

    if (expiredBookingError) {
      console.error("Failed to update booking request after match expiry", {
        code: expiredBookingError.code,
        message: expiredBookingError.message,
        details: expiredBookingError.details,
        hint: expiredBookingError.hint,
        matchId: match.id,
        bookingId: match.booking_id,
      });
    }

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
      console.error("Failed to update match", {
        code: matchUpdateError.code,
        message: matchUpdateError.message,
        details: matchUpdateError.details,
        hint: matchUpdateError.hint,
        matchId: match.id,
      });
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

  let rentalRow: { rentalId: string; checkIn: string | null; ownerUserId: string; rentalAmountCents: number | null };
  try {
    rentalRow = await ensureRentalForMatch({ adminClient, matchId: match.id, ownerUserId: owner.user_id ?? user.id });
  } catch (error) {
    console.error("Failed to ensure rental", {
      matchId: match.id,
      bookingId: booking.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  const { error: bookingUpdateError } = await adminClient
    .from("booking_requests")
    .update({ status: "matched", updated_at: nowIso })
    .eq("id", booking.id);

  if (bookingUpdateError) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to update booking request", {
        code: bookingUpdateError.code,
        message: bookingUpdateError.message,
        details: bookingUpdateError.details,
        hint: bookingUpdateError.hint,
        matchId: match.id,
        bookingId: booking.id,
      });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[owner/matches/accept] rental ready", {
      match_id: match.id,
      rental_id: rentalRow.rentalId,
    });
  }

  return NextResponse.json({ rentalId: rentalRow.rentalId });
}

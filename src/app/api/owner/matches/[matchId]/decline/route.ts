import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

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
    .select("id, status, booking_id, owner_id, owner_membership_id, points_reserved, points_reserved_current, points_reserved_borrowed, created_at, expires_at")
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

  if (match.status !== "pending_owner") {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 409 });
  }

  const { error: matchUpdateError } = await adminClient
    .from("booking_matches")
    .update({ status: "declined", responded_at: nowIso })
    .eq("id", match.id);

  if (matchUpdateError) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to update match", matchUpdateError);
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  const reservedCurrent = match.points_reserved_current ?? match.points_reserved ?? 0;
  if (match.owner_membership_id && reservedCurrent) {
    const { data: membership } = await adminClient
      .from("owner_memberships")
      .select("id, points_reserved")
      .eq("id", match.owner_membership_id)
      .maybeSingle();

    if (membership) {
      const newReserved = Math.max((membership.points_reserved ?? 0) - reservedCurrent, 0);
      const { error: restoreError } = await adminClient
        .from("owner_memberships")
        .update({ points_reserved: newReserved })
        .eq("id", match.owner_membership_id);

      if (restoreError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to restore points", restoreError);
        }
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
      }
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

  const { error: bookingUpdateError } = await adminClient
    .from("booking_requests")
    .update({ status: "pending_match", matched_owner_id: null, updated_at: nowIso })
    .eq("id", match.booking_id);

  if (bookingUpdateError) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to update booking request", bookingUpdateError);
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

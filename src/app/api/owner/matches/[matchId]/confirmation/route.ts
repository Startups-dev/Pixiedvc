import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { calculatePayoutAmountCents } from "@/lib/owner-portal";

export async function POST(
  request: Request,
  { params }: { params: { matchId: string } },
) {
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

  let payload: { confirmationNumber?: string } | null = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const confirmationNumber = payload?.confirmationNumber?.trim() ?? "";
  if (confirmationNumber.length < 6) {
    return NextResponse.json({ error: "Invalid confirmation number." }, { status: 400 });
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
    .select("id, booking_id, status, owner_membership_id, points_reserved_current, points_reserved_borrowed")
    .eq("id", params.matchId)
    .eq("owner_id", owner.id)
    .maybeSingle();

  if (!match) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 404 });
  }

  const { data: rental } = await adminClient
    .from("rentals")
    .select("id, check_in, owner_user_id, rental_amount_cents")
    .eq("match_id", match.id)
    .maybeSingle();

  if (!rental) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 404 });
  }

  const { error: rentalError } = await adminClient
    .from("rentals")
    .update({
      dvc_confirmation_number: confirmationNumber,
      status: "booked_pending_agreement",
      updated_at: new Date().toISOString(),
    })
    .eq("id", rental.id);

  if (rentalError) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to save confirmation number", rentalError);
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  if (match.status !== "booked") {
    const { error: matchError } = await adminClient
      .from("booking_matches")
      .update({ status: "booked", responded_at: new Date().toISOString() })
      .eq("id", match.id);

    if (matchError && process.env.NODE_ENV !== "production") {
      console.error("Failed to update match status", matchError);
    }
  }

  const payout70Amount = calculatePayoutAmountCents(rental.rental_amount_cents, 70);
  const payout30Amount = calculatePayoutAmountCents(rental.rental_amount_cents, 30);
  const nowIso = new Date().toISOString();

  await adminClient
    .from("payout_ledger")
    .upsert(
      {
        rental_id: rental.id,
        owner_user_id: rental.owner_user_id,
        stage: 70,
        amount_cents: payout70Amount,
        status: "eligible",
        eligible_at: nowIso,
      },
      { onConflict: "rental_id,stage" },
    );

  await adminClient
    .from("payout_ledger")
    .upsert(
      {
        rental_id: rental.id,
        owner_user_id: rental.owner_user_id,
        stage: 30,
        amount_cents: payout30Amount,
        status: "pending",
        eligible_at: null,
      },
      { onConflict: "rental_id,stage" },
    );

  const reservedCurrent = match.points_reserved_current ?? 0;
  if (match.owner_membership_id && reservedCurrent > 0) {
    const { data: membership } = await adminClient
      .from("owner_memberships")
      .select("id, points_reserved, points_rented")
      .eq("id", match.owner_membership_id)
      .maybeSingle();

    if (membership) {
      const nextReserved = Math.max((membership.points_reserved ?? 0) - reservedCurrent, 0);
      const nextRented = (membership.points_rented ?? 0) + reservedCurrent;
      await adminClient
        .from("owner_memberships")
        .update({ points_reserved: nextReserved, points_rented: nextRented })
        .eq("id", membership.id);
    }
  }

  const reservedBorrowed = match.points_reserved_borrowed ?? 0;
  if (reservedBorrowed > 0 && rental?.check_in) {
    const bookingYear = new Date(rental.check_in).getUTCFullYear();
    const { data: currentMembership } = await adminClient
      .from("owner_memberships")
      .select("owner_id, resort_id, contract_year")
      .eq("id", match.owner_membership_id)
      .maybeSingle();

    if (currentMembership?.owner_id && currentMembership?.resort_id) {
      const targetYear = (currentMembership.contract_year ?? bookingYear) + 1;
      const { data: nextMembership } = await adminClient
        .from("owner_memberships")
        .select("id, points_reserved, points_rented")
        .eq("owner_id", currentMembership.owner_id)
        .eq("resort_id", currentMembership.resort_id)
        .eq("contract_year", targetYear)
        .maybeSingle();

      if (nextMembership) {
        const nextReserved = Math.max((nextMembership.points_reserved ?? 0) - reservedBorrowed, 0);
        const nextRented = (nextMembership.points_rented ?? 0) + reservedBorrowed;
        await adminClient
          .from("owner_memberships")
          .update({ points_reserved: nextReserved, points_rented: nextRented })
          .eq("id", nextMembership.id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

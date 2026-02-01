import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { calculatePayoutAmountCents } from "@/lib/owner-portal";
import { ensureRentalForMatch } from "@/lib/rentals/ensureRentalForMatch";
import { ensureGuestAgreementForBooking } from "@/server/contracts";

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

  const debugEnabled = process.env.NODE_ENV !== "production";

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

  const { data: match } = await adminClient
    .from("booking_matches")
    .select("id, booking_id, status, owner_id, owner_membership_id, points_reserved_current, points_reserved_borrowed")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 404 });
  }

  let rentalRow: {
    rentalId: string;
    checkIn: string | null;
    ownerUserId: string;
    rentalAmountCents: number | null;
  };
  try {
    rentalRow = await ensureRentalForMatch({ adminClient, matchId: match.id, ownerUserId: user.id });
  } catch (error) {
    if (debugEnabled) {
      console.error("Failed to ensure rental", error);
      console.debug("[owner/confirmation] ensureRentalForMatch failed", {
        matchId: match.id,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
    const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    return NextResponse.json(
      { error: "Something went wrong. Please try again.", debug: debugEnabled ? message : undefined },
      { status: 500 },
    );
  }

  if (rentalRow.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 404 });
  }

  const { error: rentalError } = await adminClient
    .from("rentals")
    .update({
      dvc_confirmation_number: confirmationNumber,
      status: "booked_pending_agreement",
      updated_at: new Date().toISOString(),
    })
    .eq("id", rentalRow.rentalId);

  if (rentalError) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to save confirmation number", rentalError);
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // Mark booking + confirmation milestones as completed (insert if missing)
  const milestoneTime = new Date().toISOString();
  await adminClient.from("rental_milestones").upsert(
    [
      {
        rental_id: rentalRow.rentalId,
        code: "owner_booked",
        status: "completed",
        occurred_at: milestoneTime,
      },
      {
        rental_id: rentalRow.rentalId,
        code: "disney_confirmation_uploaded",
        status: "completed",
        occurred_at: milestoneTime,
      },
    ],
    { onConflict: "rental_id,code" },
  );

  // Keep contract snapshot in sync with confirmation number for guest-facing pages.
  const { data: latestContract } = await adminClient
    .from("contracts")
    .select("id, snapshot")
    .eq("booking_request_id", match.booking_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestContract?.id && latestContract.snapshot) {
    const snapshot = latestContract.snapshot as Record<string, unknown>;
    const summary = (snapshot.summary as Record<string, unknown> | null) ?? {};
    const nextSnapshot = {
      ...snapshot,
      confirmationNumber,
      summary: {
        ...summary,
        reservationNumber: confirmationNumber,
      },
    };

    await adminClient
      .from("contracts")
      .update({ snapshot: nextSnapshot })
      .eq("id", latestContract.id);
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[owner/matches/confirmation] confirmation saved", {
      match_id: match.id,
      has_confirmation: Boolean(confirmationNumber),
    });
  }

  if (match.status !== "accepted") {
    const { error: matchError } = await adminClient
      .from("booking_matches")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", match.id);

    if (matchError && process.env.NODE_ENV !== "production") {
      console.error("Failed to update match status", matchError);
    }
  }

  let contractWarning: { ok: false; error: string; debug?: string } | null = null;
  try {
    await ensureGuestAgreementForBooking({
      supabase: adminClient,
      ownerId: match.owner_id,
      bookingRequestId: match.booking_id,
      rentalId: rentalRow.rentalId,
      confirmationNumber,
    });
  } catch (contractError) {
    if (debugEnabled) {
      console.error("Failed to generate guest agreement", contractError);
    }
    const message =
      contractError instanceof Error
        ? contractError.message
        : typeof contractError === "string"
          ? contractError
          : contractError && typeof (contractError as { message?: string }).message === "string"
            ? (contractError as { message?: string }).message
            : JSON.stringify(contractError);
    contractWarning = {
      ok: false,
      error: "Agreement generation failed.",
      debug: debugEnabled ? message : undefined,
    };
  }

  const payout70Amount = calculatePayoutAmountCents(rentalRow.rentalAmountCents, 70);
  const payout30Amount = calculatePayoutAmountCents(rentalRow.rentalAmountCents, 30);
  const nowIso = new Date().toISOString();

  await adminClient
    .from("payout_ledger")
    .upsert(
      {
        rental_id: rentalRow.rentalId,
        owner_user_id: rentalRow.ownerUserId,
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
        rental_id: rentalRow.rentalId,
        owner_user_id: rentalRow.ownerUserId,
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
  if (reservedBorrowed > 0 && rentalRow.checkIn) {
    const bookingYear = new Date(rentalRow.checkIn).getUTCFullYear();
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

  return NextResponse.json({ ok: true, rentalSaved: true, contract: contractWarning });
}

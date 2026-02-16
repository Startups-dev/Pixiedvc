import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { calculatePayoutAmountCents } from "@/lib/owner-portal";
import { ensureGuestAgreementForBooking } from "@/server/contracts";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ rentalId: string }> },
) {
  const cookieStore = await cookies();
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { storage_path, original_name, type, confirmation_number } = payload ?? {};

  const { rentalId } = await params;
  const { data: rental } = await authClient
    .from("rentals")
    .select("id, owner_user_id, owner_id, rental_amount_cents, booking_request_id, dvc_confirmation_number")
    .eq("id", rentalId)
    .maybeSingle();

  if (!rental || rental.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const incomingConfirmation =
    typeof confirmation_number === "string" ? confirmation_number.trim() : "";
  const resolvedConfirmation = incomingConfirmation || rental.dvc_confirmation_number || "";

  if (resolvedConfirmation.length < 6) {
    return NextResponse.json({ error: "Invalid confirmation number." }, { status: 400 });
  }

  const client = getSupabaseAdminClient() ?? authClient;

  const { error: rentalUpdateError } = await client
    .from("rentals")
    .update({
      dvc_confirmation_number: resolvedConfirmation,
      status: "booked_pending_agreement",
      updated_at: new Date().toISOString(),
    })
    .eq("id", rentalId);

  if (rentalUpdateError) {
    return NextResponse.json({ error: rentalUpdateError.message }, { status: 400 });
  }

  const { error: milestoneError } = await client
    .from("rental_milestones")
    .upsert({
      rental_id: rentalId,
      code: "disney_confirmation_uploaded",
      status: "completed",
      occurred_at: new Date().toISOString(),
    })
    .eq("rental_id", rentalId)
    .eq("code", "disney_confirmation_uploaded");

  if (milestoneError) {
    return NextResponse.json({ error: milestoneError.message }, { status: 400 });
  }

  if (storage_path) {
    const { error: docError } = await client
      .from("rental_documents")
      .insert({
        rental_id: rentalId,
        type: type ?? "disney_confirmation_email",
        storage_path,
        uploaded_by_user_id: user.id,
        meta: { original_name },
      });

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 400 });
    }

    const amountCents = calculatePayoutAmountCents(rental.rental_amount_cents, 70);
    const { error: payoutError } = await client
      .from("payout_ledger")
      .upsert({
        rental_id: rentalId,
        owner_user_id: rental.owner_user_id,
        stage: 70,
        amount_cents: amountCents,
        status: "eligible",
        eligible_at: new Date().toISOString(),
      })
      .eq("rental_id", rentalId)
      .eq("stage", 70);

    if (payoutError) {
      return NextResponse.json({ error: payoutError.message }, { status: 400 });
    }
  }

  if (rental.booking_request_id && rental.owner_id) {
    try {
      await ensureGuestAgreementForBooking({
        supabase: client,
        ownerId: rental.owner_id,
        bookingRequestId: rental.booking_request_id,
        rentalId,
        confirmationNumber: resolvedConfirmation,
      });
    } catch (contractError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to generate guest agreement", contractError);
      }
    }
  }

  await client
    .from("notifications")
    .insert({
      user_id: user.id,
      type: "confirmation_uploaded",
      title: "Disney confirmation uploaded",
      body: "We received your Disney confirmation. The 70% payout is now eligible.",
      link: `/owner/rentals/${rentalId}`,
    });

  return NextResponse.json({ ok: true });
}

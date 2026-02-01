import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { APPROVAL_PREREQUISITES } from "@/lib/owner-portal";

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

  const { rentalId } = await params;
  const client = getSupabaseAdminClient() ?? authClient;

  const { data: owner } = await client
    .from("owners")
    .select("id, user_id")
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  const { data: rental } = await client
    .from("rentals")
    .select("id, owner_user_id, owner_id, guest_user_id, lead_guest_name, lead_guest_email, lead_guest_phone, booking_package")
    .eq("id", rentalId)
    .maybeSingle();

  const isOwner =
    rental &&
    (rental.owner_user_id === user.id ||
      (owner?.id && rental.owner_id === owner.id) ||
      (owner?.user_id && rental.owner_user_id === owner.user_id));

  if (!rental || !isOwner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const bookingPackage = (rental.booking_package ?? {}) as Record<string, unknown>;
  const leadGuestName =
    rental.lead_guest_name ?? (bookingPackage.lead_guest_name as string | null) ?? null;
  const leadGuestEmail =
    rental.lead_guest_email ?? (bookingPackage.lead_guest_email as string | null) ?? null;
  const leadGuestPhone =
    rental.lead_guest_phone ?? (bookingPackage.lead_guest_phone as string | null) ?? null;
  const depositPaid = typeof bookingPackage.deposit_paid === "number" ? bookingPackage.deposit_paid : null;

  const nowIso = new Date().toISOString();
  const shouldGuestVerified = Boolean(
    rental.guest_user_id || (leadGuestName && leadGuestEmail && leadGuestPhone),
  );
  const shouldPaymentVerified = typeof depositPaid === "number" && depositPaid >= 99;

  if (shouldGuestVerified) {
    await client
      .from("rental_milestones")
      .upsert(
        {
          rental_id: rentalId,
          code: "guest_verified",
          status: "completed",
          occurred_at: nowIso,
        },
        { onConflict: "rental_id,code" },
      );
  }

  if (shouldPaymentVerified) {
    await client
      .from("rental_milestones")
      .upsert(
        {
          rental_id: rentalId,
          code: "payment_verified",
          status: "completed",
          occurred_at: nowIso,
        },
        { onConflict: "rental_id,code" },
      );
  }

  const { data: prereqRows } = await client
    .from("rental_milestones")
    .select("code, status")
    .eq("rental_id", rentalId)
    .in("code", APPROVAL_PREREQUISITES as string[]);

  const missing = (APPROVAL_PREREQUISITES as string[]).filter(
    (code) => !prereqRows?.some((row) => row.code === code && row.status === "completed"),
  );

  if (missing.length > 0) {
    return NextResponse.json({ error: "Approval prerequisites missing.", missing }, { status: 400 });
  }

  const { error: milestoneError } = await client
    .from("rental_milestones")
    .upsert(
      {
        rental_id: rentalId,
        code: "owner_approved",
        status: "completed",
        occurred_at: new Date().toISOString(),
      },
      { onConflict: "rental_id,code" },
    );

  if (milestoneError) {
    return NextResponse.json({ error: milestoneError.message }, { status: 400 });
  }

  const { error: rentalUpdateError } = await client
    .from("rentals")
    .update({ status: "approved" })
    .eq("id", rentalId);

  if (rentalUpdateError) {
    return NextResponse.json({ error: rentalUpdateError.message }, { status: 400 });
  }

  const { error: notificationError } = await client
    .from("notifications")
    .insert({
      user_id: user.id,
      type: "owner_approval",
      title: "Booking package approved",
      body: "Thanks for confirming the booking package. We'll keep things moving.",
      link: `/owner/rentals/${rentalId}`,
    });

  if (notificationError) {
    return NextResponse.json({ error: notificationError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

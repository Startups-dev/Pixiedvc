import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const MILESTONE_CODES = [
  "matched",
  "guest_verified",
  "payment_verified",
  "booking_package_sent",
  "agreement_sent",
  "owner_approved",
  "owner_booked",
  "check_in",
  "check_out",
] as const;

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key not configured." }, { status: 500 });
  }

  const { data: rental, error: rentalError } = await adminClient
    .from("rentals")
    .insert({
      owner_user_id: user.id,
      resort_code: "BLT",
      room_type: "Studio",
      check_in: addDays(30),
      check_out: addDays(37),
      points_required: 120,
      rental_amount_cents: 450000,
      status: "awaiting_owner_approval",
    })
    .select("id")
    .single();

  if (rentalError || !rental) {
    return NextResponse.json({ error: rentalError?.message ?? "Failed to create rental." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const milestoneRows = MILESTONE_CODES.map((code) => ({
    rental_id: rental.id,
    code,
    status: code === "matched" ? "completed" : "pending",
    occurred_at: code === "matched" ? now : null,
  }));

  const { error: milestoneError } = await adminClient.from("rental_milestones").insert(milestoneRows);

  if (milestoneError) {
    return NextResponse.json({ error: milestoneError.message }, { status: 400 });
  }

  return NextResponse.json({ rentalId: rental.id });
}

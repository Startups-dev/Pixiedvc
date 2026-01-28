import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rentalId: string }> },
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rentalId } = await params;
  const { data, error } = await supabase
    .from("rentals")
    .select(
      "id, owner_user_id, guest_user_id, resort_code, room_type, check_in, check_out, points_required, rental_amount_cents, status, created_at, booking_package, lead_guest_name, lead_guest_email, lead_guest_phone, lead_guest_address, party_size, special_needs, special_needs_notes, rental_milestones(code, status, occurred_at, meta), rental_documents(id, type, storage_path, uploaded_by_user_id, created_at, meta), payout_ledger(id, rental_id, owner_user_id, stage, amount_cents, status, eligible_at, released_at, created_at), rental_exceptions(id, rental_id, owner_user_id, type, message, status, created_at)",
    )
    .eq("owner_user_id", user.id)
    .eq("id", rentalId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ rental: data });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("rentals")
    .select(
      "id, owner_user_id, guest_user_id, resort_code, room_type, check_in, check_out, points_required, rental_amount_cents, status, created_at, lead_guest_name, lead_guest_email, lead_guest_phone, party_size, booking_package, rental_milestones(code, status, occurred_at)",
    )
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ rentals: data ?? [] });
}

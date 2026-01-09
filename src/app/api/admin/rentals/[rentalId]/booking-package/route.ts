import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function toNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function POST(request: Request, { params }: { params: { rentalId: string } }) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email ?? null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const bookingPackage = "booking_package" in payload ? payload.booking_package : payload;
  if (!bookingPackage || typeof bookingPackage !== "object") {
    return NextResponse.json({ error: "booking_package must be an object" }, { status: 400 });
  }

  const lead_guest_name = typeof bookingPackage.lead_guest_name === "string" ? bookingPackage.lead_guest_name : null;
  const lead_guest_email = typeof bookingPackage.lead_guest_email === "string" ? bookingPackage.lead_guest_email : null;
  const lead_guest_phone = typeof bookingPackage.lead_guest_phone === "string" ? bookingPackage.lead_guest_phone : null;
  const lead_guest_address =
    bookingPackage.lead_guest_address && typeof bookingPackage.lead_guest_address === "object"
      ? bookingPackage.lead_guest_address
      : null;
  const party_size = toNumber(bookingPackage.party_size);
  const adults = toNumber(bookingPackage.adults);
  const youths = toNumber(bookingPackage.youths);
  const special_needs = toBoolean(bookingPackage.special_needs);
  const special_needs_notes =
    typeof bookingPackage.special_needs_notes === "string" ? bookingPackage.special_needs_notes : null;

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
  }

  const { data, error } = await adminClient
    .from("rentals")
    .update({
      booking_package: bookingPackage,
      lead_guest_name,
      lead_guest_email,
      lead_guest_phone,
      lead_guest_address,
      party_size,
      adults,
      youths,
      special_needs,
      special_needs_notes,
    })
    .eq("id", params.rentalId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Rental not found" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, rentalId: data.id });
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type OwnerReservationPayload = {
  resort_id?: string;
  check_in?: string;
  check_out?: string;
  room_type?: string;
  points?: number;
  confirmation_number?: string | null;
  confirmation_uploaded?: boolean;
};

export async function GET() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
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

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as OwnerReservationPayload;
  const resortId = typeof payload.resort_id === "string" ? payload.resort_id.trim() : "";
  const roomType = typeof payload.room_type === "string" ? payload.room_type.trim() : "";
  const points = Number(payload.points);
  const checkIn = typeof payload.check_in === "string" ? payload.check_in.trim() : "";
  const checkOut = typeof payload.check_out === "string" ? payload.check_out.trim() : "";
  const confirmationNumber =
    typeof payload.confirmation_number === "string" ? payload.confirmation_number.trim() : "";
  const confirmationUploaded = Boolean(payload.confirmation_uploaded);

  if (!resortId || !checkIn || !checkOut || !roomType || !Number.isFinite(points) || points <= 0) {
    return NextResponse.json({ error: "Missing or invalid reservation details." }, { status: 400 });
  }

  if (checkIn >= checkOut) {
    return NextResponse.json({ error: "Check-out must be after check-in." }, { status: 400 });
  }

  if (confirmationUploaded && confirmationNumber.length < 6) {
    return NextResponse.json({ error: "Invalid confirmation number." }, { status: 400 });
  }

  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!owner) {
    return NextResponse.json({ error: "Owner profile not found." }, { status: 400 });
  }

  const { data: resort } = await supabase
    .from("resorts")
    .select("id, slug, calculator_code")
    .eq("id", resortId)
    .maybeSingle();

  if (!resort) {
    return NextResponse.json({ error: "Resort not found." }, { status: 400 });
  }

  const resortCode = resort.calculator_code ?? resort.slug ?? null;
  if (!resortCode) {
    return NextResponse.json({ error: "Resort code missing." }, { status: 400 });
  }

  const status = confirmationUploaded && confirmationNumber ? "booked" : "draft";

  const client = getSupabaseAdminClient() ?? supabase;
  const { data: rental, error: rentalError } = await client
    .from("rentals")
    .insert({
      owner_user_id: user.id,
      owner_id: owner.id,
      resort_id: resort.id,
      resort_code: resortCode,
      room_type: roomType,
      check_in: checkIn,
      check_out: checkOut,
      points_required: Math.round(points),
      dvc_confirmation_number: confirmationNumber || null,
      status,
    })
    .select("id")
    .single();

  if (rentalError || !rental) {
    return NextResponse.json({ error: rentalError?.message ?? "Unable to create reservation." }, { status: 400 });
  }

  if (confirmationUploaded && confirmationNumber) {
    const { error: milestoneError } = await client
      .from("rental_milestones")
      .upsert({
        rental_id: rental.id,
        code: "disney_confirmation_uploaded",
        status: "completed",
        occurred_at: new Date().toISOString(),
      })
      .eq("rental_id", rental.id)
      .eq("code", "disney_confirmation_uploaded");

    if (milestoneError) {
      return NextResponse.json({ error: milestoneError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ rentalId: rental.id });
}

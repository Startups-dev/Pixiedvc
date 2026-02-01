import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookingId = url.searchParams.get("id") ?? "";
  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking id." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("booking_requests")
    .select("id, renter_id, status, deposit_paid, deposit_currency")
    .eq("id", bookingId)
    .eq("renter_id", user.id)
    .maybeSingle();

  if (process.env.NODE_ENV !== "production") {
    console.info("[booking/status]", {
      booking_request_id: bookingId,
      has_user: Boolean(user?.id),
      found: Boolean(data),
    });
  }

  if (error || !data) {
    if (process.env.NODE_ENV !== "production") {
      const { data: anyBooking } = await supabase
        .from("booking_requests")
        .select("id, renter_id")
        .eq("id", bookingId)
        .maybeSingle();

      console.info("[booking/status] 404 detail", {
        booking_request_id: bookingId,
        user_id: user.id,
        exists: Boolean(anyBooking),
        renter_id: anyBooking?.renter_id ?? null,
      });
    }

    const devPayload =
      process.env.NODE_ENV !== "production"
        ? {
            error: "not_found",
            reason: "not_owner_or_missing",
            booking_request_id: bookingId,
          }
        : { error: "Not found." };
    return NextResponse.json(devPayload, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    status: data.status,
    deposit_paid: data.deposit_paid,
    deposit_currency: data.deposit_currency,
  });
}

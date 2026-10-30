import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isDesignatedTestGuest, isTestBookingEnabled } from "@/lib/test-guest-booking";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const session = await createSupabaseServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!isDesignatedTestGuest(user.id) || !(await isTestBookingEnabled())) {
    return NextResponse.json({ error: "TEST_BOOKING_FORBIDDEN" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
  if (!UUID_PATTERN.test(bookingId)) {
    return NextResponse.json({ error: "INVALID_BOOKING_ID" }, { status: 400 });
  }
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "TEST_BOOKING_UNAVAILABLE" }, { status: 503 });

  const { data: booking, error: lookupError } = await admin.from("booking_requests")
    .select("id, renter_id, status, is_test_booking, deposit_status, deposit_due, deposit_paid")
    .eq("id", bookingId).eq("renter_id", user.id).maybeSingle();
  if (lookupError || !booking || booking.is_test_booking !== true) {
    return NextResponse.json({ error: "TEST_BOOKING_NOT_FOUND" }, { status: 404 });
  }
  if (booking.status === "submitted" && booking.deposit_status === "test_bypassed" && Number(booking.deposit_paid) === 0) {
    return NextResponse.json({ ok: true, bookingId, depositStatus: "test_bypassed" });
  }
  if (booking.status !== "draft" || booking.deposit_status !== "test_pending" || Number(booking.deposit_due) !== 99 || Number(booking.deposit_paid) !== 0) {
    return NextResponse.json({ error: "TEST_BOOKING_STATE_INVALID" }, { status: 409 });
  }

  const { data: updated, error } = await admin.from("booking_requests")
    .update({ status: "submitted", deposit_status: "test_bypassed", updated_at: new Date().toISOString() })
    .eq("id", bookingId).eq("renter_id", user.id).eq("is_test_booking", true)
    .eq("status", "draft").eq("deposit_status", "test_pending").eq("deposit_paid", 0)
    .select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "TEST_BOOKING_COMPLETION_FAILED" }, { status: 503 });
  if (!updated) return NextResponse.json({ error: "TEST_BOOKING_STATE_CHANGED" }, { status: 409 });
  return NextResponse.json({ ok: true, bookingId, depositStatus: "test_bypassed" });
}

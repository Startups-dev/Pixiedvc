import { NextResponse } from "next/server";

import { getAdminReservationAlertContext, validRenterRequestId } from "@/lib/admin-reservation-alerts";

export async function POST(request: Request) {
  const auth = await getAdminReservationAlertContext();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const requestId = typeof body?.requestId === "string" ? body.requestId : "";
  const source = body?.source;
  const validId = source === "renter"
    ? validRenterRequestId(requestId)
    : /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(requestId);
  if (!validId || !["booking", "renter"].includes(source)) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }
  const column = source === "renter" ? "renter_request_id" : "booking_request_id";
  const { error } = await auth.client.from("admin_reservation_request_alerts")
    .update({ read_at: new Date().toISOString(), read_by: auth.userId })
    .eq(column, requestId).is("read_at", null);
  if (error) return NextResponse.json({ ok: false, error: "RESERVATION_ALERT_READ_FAILED" }, { status: 503 });
  return NextResponse.json({ ok: true });
}

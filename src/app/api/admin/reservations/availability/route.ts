import { NextResponse } from "next/server";

import { validRenterRequestId } from "@/lib/admin-reservation-alerts";
import { getAdminReservationAlertContext } from "@/lib/admin-reservation-alerts-server";

const VALID_STATUSES = new Set(["available", "unavailable", "needs_clarification"]);

export async function POST(request: Request) {
  const auth = await getAdminReservationAlertContext();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const requestId = typeof body?.requestId === "string" ? body.requestId : "";
  const status = body?.availabilityStatus;
  if (!validRenterRequestId(requestId) || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }
  const { data, error } = await auth.client.from("renter_requests")
    .update({ availability_status: status, availability_checked_at: new Date().toISOString() })
    .eq("id", requestId).eq("status", "submitted")
    .select("id").maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: "AVAILABILITY_SAVE_FAILED" }, { status: 503 });
  if (!data) return NextResponse.json({ ok: false, error: "REQUEST_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

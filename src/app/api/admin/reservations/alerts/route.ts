import { NextResponse } from "next/server";

import { toReservationAlertEvent } from "@/lib/admin-reservation-alerts";
import { getAdminReservationAlertContext } from "@/lib/admin-reservation-alerts-server";

export const dynamic = "force-dynamic";

const OVERLAP_MS = 5_000;

export async function GET(request: Request) {
  const auth = await getAdminReservationAlertContext();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const baseline = url.searchParams.get("baseline") === "1";
  const after = url.searchParams.get("after");
  if (!baseline && after && !Number.isFinite(Date.parse(after))) {
    return NextResponse.json({ ok: false, error: "INVALID_CURSOR" }, { status: 400 });
  }
  const since = after ? new Date(Date.parse(after) - OVERLAP_MS).toISOString() : null;
  const columns = "id, booking_request_id, renter_request_id, ready_stay_id, is_test_booking, created_at";
  const [unread, recent, pendingReadyStays] = await Promise.all([
    auth.client.from("admin_reservation_request_alerts")
      .select(columns, { count: "exact" }).is("read_at", null)
      .order("created_at", { ascending: false }).limit(1),
    baseline || !since
      ? Promise.resolve({ data: [], error: null })
      : auth.client.from("admin_reservation_request_alerts")
        .select(columns).gte("created_at", since)
        .order("created_at", { ascending: true }).limit(1000),
    auth.client.from("ready_stays").select("id", { count: "exact", head: true })
      .eq("is_test_listing", false)
      .or("and(status.eq.draft,verification_status.is.null),and(status.eq.draft,verification_status.neq.rejected),and(verification_status.eq.proof_uploaded,status.neq.sold,status.neq.expired,status.neq.removed)"),
  ]);
  if (unread.error || recent.error || pendingReadyStays.error) {
    return NextResponse.json({ ok: false, error: "RESERVATION_ALERTS_UNAVAILABLE" }, { status: 503 });
  }
  const now = new Date().toISOString();
  return NextResponse.json({
    ok: true,
    cursor: now,
    unreadCount: unread.count ?? 0,
    pendingReadyStayReviewCount: pendingReadyStays.count ?? 0,
    latestUnread: unread.data?.[0] ? toReservationAlertEvent(unread.data[0]) : null,
    events: (recent.data ?? []).map(toReservationAlertEvent).filter(Boolean),
  }, { headers: { "Cache-Control": "no-store, private" } });
}

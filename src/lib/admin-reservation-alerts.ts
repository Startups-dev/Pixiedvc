export type ReservationAlertEvent = {
  kind: "reservation";
  id: string;
  requestId: string;
  source: "booking" | "renter";
  createdAt: string;
};

export const RESERVATION_ALERT_COPY = "New reservation request — availability review needed.";

export function validRenterRequestId(value: string) {
  return /^[1-9]\d{0,18}$/.test(value) && (value.length < 19 || value <= "9223372036854775807");
}

export function buildReservationReviewUrl(event: Pick<ReservationAlertEvent, "requestId" | "source">) {
  const root = event.source === "renter" ? "/admin/requests/renter" : "/admin/requests";
  return `${root}/${encodeURIComponent(event.requestId)}#availability-review`;
}

export function toReservationAlertEvent(row: {
  id: string;
  booking_request_id: string | null;
  renter_request_id: number | string | null;
  created_at: string;
}): ReservationAlertEvent | null {
  const source = row.booking_request_id ? "booking" : row.renter_request_id != null ? "renter" : null;
  const requestId = row.booking_request_id ?? (row.renter_request_id == null ? null : String(row.renter_request_id));
  return source && requestId
    ? { kind: "reservation", id: row.id, requestId, source, createdAt: row.created_at }
    : null;
}

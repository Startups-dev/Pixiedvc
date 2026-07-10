import { attachBookingAttribution } from "@/lib/booking-attribution";

export async function attachAffiliateLead(bookingRequestId: string) {
  await attachBookingAttribution(bookingRequestId, { source: "future_booking_flow" });
}

import { describe, expect, it, vi } from "vitest";
import { buildReservationReviewUrl, RESERVATION_ALERT_COPY, toReservationAlertEvent, validRenterRequestId } from "@/lib/admin-reservation-alerts";
import { buildReservationRequestSms, getQuietHoursEnd } from "@/lib/admin-inbox-sms";
import { evaluateReservationSms } from "@/lib/admin-inbox-sms-dispatch";
import { playInboxAlertSoundOnce, rememberSeenInboxAlertId } from "@/lib/admin-inbox-alerts";

describe("reservation staff alerts", () => {
  const event = toReservationAlertEvent({ id: "alert-1", booking_request_id: "booking-1", renter_request_id: null, created_at: "2026-10-24T10:00:00Z" });

  it("links directly to availability review without putting customer details in previews", () => {
    expect(event).toMatchObject({ source: "booking", requestId: "booking-1" });
    expect(buildReservationReviewUrl(event!)).toBe("/admin/requests/booking-1#availability-review");
    const renterEvent = toReservationAlertEvent({ id: "alert-2", booking_request_id: null, renter_request_id: 42, created_at: "2026-10-24T10:00:00Z" });
    expect(renterEvent).toMatchObject({ source: "renter", requestId: "42" });
    expect(buildReservationReviewUrl(renterEvent!)).toBe("/admin/requests/renter/42#availability-review");
    expect(RESERVATION_ALERT_COPY).toBe("New reservation request — availability review needed.");
    const sms = buildReservationRequestSms("booking", "booking-1");
    expect(sms).toContain(RESERVATION_ALERT_COPY);
    expect(sms).toContain("/admin/requests/booking-1#availability-review");
    expect(sms).not.toMatch(/guest|check.in|resort|phone/i);
  });

  it("accepts production bigint renter IDs as decimal strings and rejects UUIDs", () => {
    expect(validRenterRequestId("42")).toBe(true);
    expect(validRenterRequestId("9223372036854775807")).toBe(true);
    expect(validRenterRequestId("9223372036854775808")).toBe(false);
    expect(validRenterRequestId("11111111-1111-4111-8111-111111111111")).toBe(false);
  });

  it("requires independent opt-in, verified phone, and current admin access", () => {
    const eligible = { authorizedAdmin: true, reservationOptedIn: true, reservationEnabled: true, phoneVerified: true, alertExists: true, alertRead: false };
    expect(evaluateReservationSms(eligible)).toBeNull();
    expect(evaluateReservationSms({ ...eligible, reservationOptedIn: false })).toBe("preferences_disabled");
    expect(evaluateReservationSms({ ...eligible, phoneVerified: false })).toBe("preferences_disabled");
    expect(evaluateReservationSms({ ...eligible, authorizedAdmin: false })).toBe("staff_no_longer_authorized");
    expect(evaluateReservationSms({ ...eligible, alertRead: true })).toBe("reservation_already_reviewed");
  });

  it("defers urgent texts until quiet hours end", () => {
    expect(getQuietHoursEnd(new Date("2026-10-25T03:00:00Z"), true, "22:00", "08:00", "America/Toronto")?.toISOString())
      .toBe("2026-10-25T12:00:00.000Z");
  });

  it("deduplicates tabs and recovers a blocked reservation chime", async () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(rememberSeenInboxAlertId(storage, "seen", "reservation:alert-1")).toBe(true);
    expect(rememberSeenInboxAlertId(storage, "seen", "reservation:alert-1")).toBe(false);
    expect(await playInboxAlertSoundOnce(storage, "sound", "reservation:alert-1", async () => { throw Error("blocked"); })).toBe("blocked");
    const play = vi.fn(async () => undefined);
    expect(await playInboxAlertSoundOnce(storage, "sound", "reservation:alert-1", play)).toBe("played");
    expect(await playInboxAlertSoundOnce(storage, "sound", "reservation:alert-1", play)).toBe("duplicate");
    expect(play).toHaveBeenCalledTimes(1);
  });
});

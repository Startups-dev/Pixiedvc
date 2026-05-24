import { beforeEach, describe, expect, it, vi } from "vitest";

const retryState = vi.hoisted(() => {
  const row = {
    id: "email-log-1",
    template_key: "guest_booking_confirmation",
    recipient_email: "guest@example.com",
    recipient_user_id: "11111111-1111-1111-1111-111111111111",
    related_entity_type: "booking_request",
    related_entity_id: "22222222-2222-2222-2222-222222222222",
    subject: "We received your PixieDVC stay request",
    status: "failed" as "pending" | "sent" | "failed",
    provider: "resend",
    provider_message_id: null,
    error_message: "provider rejected request",
    metadata: { bookingId: "22222222-2222-2222-2222-222222222222" },
    created_at: new Date().toISOString(),
    sent_at: null,
    failed_at: new Date().toISOString(),
    retry_count: 0,
    last_retry_at: null as string | null,
  };

  const booking = {
    id: "22222222-2222-2222-2222-222222222222",
    renter_id: "11111111-1111-1111-1111-111111111111",
    lead_guest_email: "guest@example.com",
    lead_guest_name: "Guest",
    check_in: "2026-06-01",
    check_out: "2026-06-05",
    primary_resort: { name: "Riviera Resort" },
  };

  return {
    row,
    booking,
    sendBookingConfirmationEmail: vi.fn(async (payload: Record<string, unknown>) => {
      retryState.row.status = "sent";
      retryState.row.sent_at = new Date().toISOString();
      retryState.row.failed_at = null;
      retryState.row.error_message = null;
      retryState.row.provider_message_id = "re_retry_123";
      retryState.lastPayload = payload;
    }),
    lastPayload: null as Record<string, unknown> | null,
    getSupabaseAdminClient: vi.fn(() => ({
      from: (table: string) => {
        if (table === "outbound_emails") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: retryState.row, error: null }),
              }),
            }),
            update: (payload: Record<string, unknown>) => {
              const secondEq = {
                select: () => ({
                  maybeSingle: async () => {
                    Object.assign(retryState.row, payload);
                    return { data: retryState.row, error: null };
                  },
                }),
              };
              return {
                eq: () => ({
                  eq: () => secondEq,
                }),
              };
            },
          };
        }

        if (table === "booking_requests") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: retryState.booking, error: null }),
              }),
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
    })),
  };
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: retryState.getSupabaseAdminClient,
}));

vi.mock("@/lib/email", () => ({
  sendBookingConfirmationEmail: retryState.sendBookingConfirmationEmail,
  sendConciergeHandoffNotification: vi.fn(),
  sendGuestAgreementSignedEmail: vi.fn(),
  sendOwnerAgreementSignedEmail: vi.fn(),
  sendOwnerMatchEmail: vi.fn(),
  sendPlainEmail: vi.fn(),
  sendReadyStayBookingPackageToOwner: vi.fn(),
}));

import { retryOutboundEmail } from "@/lib/admin/retry-outbound-email";

describe("retryOutboundEmail", () => {
  beforeEach(() => {
    retryState.row.status = "failed";
    retryState.row.provider_message_id = null;
    retryState.row.error_message = "provider rejected request";
    retryState.row.sent_at = null;
    retryState.row.failed_at = new Date().toISOString();
    retryState.row.retry_count = 0;
    retryState.row.last_retry_at = null;
    retryState.sendBookingConfirmationEmail.mockClear();
    retryState.getSupabaseAdminClient.mockClear();
    retryState.lastPayload = null;
  });

  it("retries a failed guest booking confirmation and increments retry metadata", async () => {
    const result = await retryOutboundEmail(retryState.row.id);

    expect(result.ok).toBe(true);
    expect(retryState.sendBookingConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(retryState.row.retry_count).toBe(1);
    expect(retryState.row.last_retry_at).toBeTruthy();
    expect(retryState.row.status).toBe("sent");
    expect(retryState.lastPayload).toMatchObject({
      templateKey: "guest_booking_confirmation",
      outboundEmailLogId: retryState.row.id,
      relatedEntityId: retryState.booking.id,
    });
  });

  it("does not retry sent rows", async () => {
    retryState.row.status = "sent";

    const result = await retryOutboundEmail(retryState.row.id);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toBe("Only failed emails can be retried.");
    }
    expect(retryState.sendBookingConfirmationEmail).not.toHaveBeenCalled();
  });

  it("blocks retries after the max retry count", async () => {
    retryState.row.retry_count = 5;

    const result = await retryOutboundEmail(retryState.row.id);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toBe("Retry limit reached for this email.");
    }
    expect(retryState.sendBookingConfirmationEmail).not.toHaveBeenCalled();
  });
});

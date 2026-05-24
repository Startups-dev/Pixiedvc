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
    status: "draft",
    availability_status: "confirmed",
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
    sendAbandonedGuestBookingRequestEmail: vi.fn(async (payload: Record<string, unknown>) => {
      retryState.row.status = "sent";
      retryState.row.sent_at = new Date().toISOString();
      retryState.row.failed_at = null;
      retryState.row.error_message = null;
      retryState.row.provider_message_id = "re_retry_124";
      retryState.lastPayload = payload;
    }),
    sendOwnerMatchReminderEmail: vi.fn(async (payload: Record<string, unknown>) => {
      retryState.row.status = "sent";
      retryState.row.sent_at = new Date().toISOString();
      retryState.row.failed_at = null;
      retryState.row.error_message = null;
      retryState.row.provider_message_id = "re_retry_125";
      retryState.lastPayload = payload;
    }),
    sendContractOwnerAgreementReminderEmail: vi.fn(async (payload: Record<string, unknown>) => {
      retryState.row.status = "sent";
      retryState.row.sent_at = new Date().toISOString();
      retryState.row.failed_at = null;
      retryState.row.error_message = null;
      retryState.row.provider_message_id = "re_retry_126";
      retryState.lastPayload = payload;
    }),
    sendContractGuestAgreementReminderEmail: vi.fn(async (payload: Record<string, unknown>) => {
      retryState.row.status = "sent";
      retryState.row.sent_at = new Date().toISOString();
      retryState.row.failed_at = null;
      retryState.row.error_message = null;
      retryState.row.provider_message_id = "re_retry_127";
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

        if (table === "booking_matches") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "33333333-3333-3333-3333-333333333333",
                    status: "pending_owner",
                    responded_at: null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "owners") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    display_name: "Owner",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "contracts") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 123,
                    owner_id: "owner-1",
                    status: "sent",
                    owner_accept_token: "owner-token",
                    owner_accepted_at: null,
                    guest_accept_token: "guest-token",
                    guest_accepted_at: null,
                    snapshot: {
                      ownerName: "Owner",
                      renterName: "Guest",
                      guestEmail: "guest@example.com",
                      summary: {
                        resortName: "Riviera Resort",
                        accommodationType: "Deluxe Studio",
                        checkIn: "2026-06-01",
                        checkOut: "2026-06-05",
                        pointsRented: 72,
                        totalPayableByGuestCents: 180000,
                        paidNowCents: 126000,
                      },
                      parties: {
                        owner: { fullName: "Owner" },
                        guest: { fullName: "Guest", email: "guest@example.com" },
                      },
                    },
                  },
                  error: null,
                }),
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
  sendAbandonedGuestBookingRequestEmail: retryState.sendAbandonedGuestBookingRequestEmail,
  sendConciergeHandoffNotification: vi.fn(),
  sendContractGuestAgreementEmail: vi.fn(),
  sendContractOwnerAgreementEmail: vi.fn(),
  sendContractGuestAgreementReminderEmail: retryState.sendContractGuestAgreementReminderEmail,
  sendContractOwnerAgreementReminderEmail: retryState.sendContractOwnerAgreementReminderEmail,
  sendGuestAgreementSignedEmail: vi.fn(),
  sendOwnerAgreementSignedEmail: vi.fn(),
  sendOwnerMatchEmail: vi.fn(),
  sendOwnerMatchReminderEmail: retryState.sendOwnerMatchReminderEmail,
  sendPlainEmail: vi.fn(),
  sendReadyStayLinkReadyEmail: vi.fn(),
  sendReadyStayBookingPackageToOwner: vi.fn(),
  sendReadyStayRejectedEmail: vi.fn(),
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
    retryState.row.template_key = "guest_booking_confirmation";
    retryState.row.subject = "We received your PixieDVC stay request";
    retryState.row.related_entity_id = retryState.booking.id;
    retryState.row.metadata = { bookingId: retryState.booking.id };
    retryState.booking.status = "draft";
    retryState.booking.availability_status = "confirmed";
    retryState.sendBookingConfirmationEmail.mockClear();
    retryState.sendAbandonedGuestBookingRequestEmail.mockClear();
    retryState.sendOwnerMatchReminderEmail.mockClear();
    retryState.sendContractOwnerAgreementReminderEmail.mockClear();
    retryState.sendContractGuestAgreementReminderEmail.mockClear();
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

  it("retries a failed abandoned guest booking request email", async () => {
    retryState.row.template_key = "abandoned_guest_booking_request";
    retryState.row.subject = "Still planning your Disney villa stay?";
    retryState.row.related_entity_id = retryState.booking.id;
    retryState.row.metadata = { bookingId: retryState.booking.id };

    const result = await retryOutboundEmail(retryState.row.id);

    expect(result.ok).toBe(true);
    expect(retryState.sendAbandonedGuestBookingRequestEmail).toHaveBeenCalledTimes(1);
    expect(retryState.lastPayload).toMatchObject({
      templateKey: "abandoned_guest_booking_request",
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

  it("retries a failed owner match reminder email", async () => {
    retryState.row.template_key = "owner_match_waiting_reminder";
    retryState.row.subject = "Reminder: guest request waiting at Riviera Resort";
    retryState.row.related_entity_id = "33333333-3333-3333-3333-333333333333";
    retryState.row.metadata = {
      bookingId: retryState.booking.id,
      matchId: "33333333-3333-3333-3333-333333333333",
      ownerId: "44444444-4444-4444-4444-444444444444",
      reminderHours: 18,
    };
    retryState.booking.status = "pending_owner";

    const result = await retryOutboundEmail(retryState.row.id);

    expect(result.ok).toBe(true);
    expect(retryState.sendOwnerMatchReminderEmail).toHaveBeenCalledTimes(1);
    expect(retryState.lastPayload).toMatchObject({
      templateKey: "owner_match_waiting_reminder",
      outboundEmailLogId: retryState.row.id,
      relatedEntityId: "33333333-3333-3333-3333-333333333333",
      guestName: "Guest",
    });
  });

  it("retries a failed owner agreement reminder email", async () => {
    retryState.row.template_key = "contract_owner_agreement_reminder";
    retryState.row.subject = "Reminder: your PixieDVC owner agreement is ready";
    retryState.row.related_entity_id = null;
    retryState.row.metadata = {
      contractId: 123,
      bookingId: retryState.booking.id,
      ownerId: "owner-1",
      recipientRole: "owner",
    };

    const result = await retryOutboundEmail(retryState.row.id);

    expect(result.ok).toBe(true);
    expect(retryState.sendContractOwnerAgreementReminderEmail).toHaveBeenCalledTimes(1);
    expect(retryState.lastPayload).toMatchObject({
      templateKey: "contract_owner_agreement_reminder",
      outboundEmailLogId: retryState.row.id,
    });
  });

  it("retries a failed guest agreement reminder email", async () => {
    retryState.row.template_key = "contract_guest_agreement_reminder";
    retryState.row.subject = "Reminder: your PixieDVC rental agreement is ready";
    retryState.row.related_entity_id = null;
    retryState.row.metadata = {
      contractId: 123,
      bookingId: retryState.booking.id,
      ownerId: "owner-1",
      recipientRole: "guest",
    };

    const result = await retryOutboundEmail(retryState.row.id);

    expect(result.ok).toBe(true);
    expect(retryState.sendContractGuestAgreementReminderEmail).toHaveBeenCalledTimes(1);
    expect(retryState.lastPayload).toMatchObject({
      templateKey: "contract_guest_agreement_reminder",
      outboundEmailLogId: retryState.row.id,
    });
  });
});

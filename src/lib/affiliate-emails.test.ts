import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ sends: [] as Array<Record<string, unknown>> }));

vi.mock("@/lib/email", () => ({
  sendPlainEmail: vi.fn(async (payload: Record<string, unknown>) => {
    state.sends.push(payload);
    return { status: "sent", outboundEmailLogId: "synthetic-log" };
  }),
}));

import {
  sendAffiliateApplicationAcknowledgment,
  sendAffiliateApplicationStaffAlert,
  sendAffiliatePayoutPaid,
  sendAffiliateRejection,
  sendAffiliateWelcome,
} from "@/lib/affiliate-emails";

describe("affiliate email notifications", () => {
  beforeEach(() => { state.sends.length = 0; });

  it("threads applicant messages while keeping staff review alerts separate", async () => {
    await sendAffiliateApplicationAcknowledgment({
      to: "affiliate@example.test", name: "Synthetic Partner", applicationId: "app-1", conversationId: "conversation-1",
    });
    await sendAffiliateApplicationStaffAlert({
      to: "staff@example.test", applicantName: "Synthetic Partner", applicationId: "app-1",
    });

    expect(state.sends[0]).toMatchObject({
      relatedEntityType: "support_conversation",
      relatedEntityId: "conversation-1",
      replyTo: "hello@hannadvc.com",
      idempotencyKey: "affiliate-application-ack-app-1",
      metadata: { inbox_email_threading: true, affiliate_application_id: "app-1" },
    });
    expect(state.sends[1]).toMatchObject({
      to: "staff@example.test",
      relatedEntityType: "affiliate_application",
      relatedEntityId: "app-1",
      metadata: { inbox_email_threading: false },
    });
    expect(state.sends[1].body).toContain("/admin/affiliates/applications?application=app-1");
  });

  it("keeps rejection notes private and uses recorded USD for payout notices", async () => {
    await sendAffiliateRejection({ to: "affiliate@example.test", name: "Synthetic Partner", applicationId: "app-2" });
    await sendAffiliateWelcome({ to: "affiliate@example.test", name: "Synthetic Partner", applicationId: "app-2", affiliateId: "affiliate-2" });
    await sendAffiliatePayoutPaid({
      to: "affiliate@example.test", name: "Synthetic Partner", amountUsd: 123.45,
      payoutItemId: "payout-1", affiliateId: "affiliate-2", conversationId: "conversation-2",
    });

    expect(state.sends[0].body).toContain("unable to approve it at this time");
    expect(state.sends[0].body).not.toContain("internal");
    expect(state.sends[2]).toMatchObject({
      subject: "Your HannaDVC affiliate payout of $123.45 USD",
      idempotencyKey: "affiliate-payout-paid-payout-1",
      relatedEntityType: "support_conversation",
      relatedEntityId: "conversation-2",
    });
    expect(state.sends[2].body).toContain("$123.45 USD");
  });
});

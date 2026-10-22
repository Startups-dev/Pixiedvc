import { describe, expect, it } from "vitest";
import { evaluateSmsEscalation } from "@/lib/admin-inbox-sms-dispatch";

const base = {
  eventType: "new_inquiry" as const,
  recipientUserId: "staff-a",
  authorizedStaff: true,
  preferencesEnabled: true,
  phoneVerified: true,
  alertTypeEnabled: true,
  inboxStatus: "needs_reply",
  assignedUserId: null,
  latestCustomerAt: "2026-10-21T12:00:00Z",
  latestDeliveredStaffReplyAt: null,
};

describe("SMS escalation dispatch eligibility", () => {
  it("allows an unanswered unclaimed inquiry after the delay even if it was marked read", () => {
    // Unread is deliberately independent from the unresolved/assignment state.
    expect(evaluateSmsEscalation(base)).toBeNull();
  });

  it("cancels a pending unassigned-inquiry alert after staff claim, reply, or close", () => {
    expect(evaluateSmsEscalation({ ...base, assignedUserId: "staff-a" })).toBe("conversation_claimed");
    expect(evaluateSmsEscalation({ ...base, latestDeliveredStaffReplyAt: "2026-10-21T12:01:00Z" })).toBe("customer_already_answered");
    expect(evaluateSmsEscalation({ ...base, inboxStatus: "closed" })).toBe("conversation_closed");
    expect(evaluateSmsEscalation({ ...base, inboxStatus: "waiting_customer" })).toBe("conversation_no_longer_needs_reply");
  });

  it("alerts only the current assignee for an unanswered assigned-conversation reply", () => {
    const assigned = { ...base, eventType: "assigned_reply" as const, assignedUserId: "staff-a" };
    expect(evaluateSmsEscalation(assigned)).toBeNull();
    expect(evaluateSmsEscalation({ ...assigned, assignedUserId: "staff-b" })).toBe("assignment_changed");
    expect(evaluateSmsEscalation({ ...assigned, authorizedStaff: false })).toBe("staff_no_longer_authorized");
    expect(evaluateSmsEscalation({ ...assigned, alertTypeEnabled: false })).toBe("assigned_reply_disabled");
  });

  it("does not suppress a customer reply just because the conversation was previously assigned", () => {
    expect(evaluateSmsEscalation({
      ...base,
      eventType: "assigned_reply",
      assignedUserId: "staff-a",
      recipientUserId: "staff-a",
    })).toBeNull();
  });

  it("requires current opt-in, enablement, and a verified phone at dispatch", () => {
    expect(evaluateSmsEscalation({ ...base, preferencesEnabled: false })).toBe("preferences_disabled");
    expect(evaluateSmsEscalation({ ...base, phoneVerified: false })).toBe("preferences_disabled");
    expect(evaluateSmsEscalation({ ...base, authorizedStaff: false })).toBe("staff_no_longer_authorized");
    expect(evaluateSmsEscalation({ ...base, latestCustomerAt: null })).toBe("customer_message_missing");
  });
});

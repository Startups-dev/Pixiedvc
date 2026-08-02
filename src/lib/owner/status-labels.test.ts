import { describe, expect, it } from "vitest";

import {
  getOwnerMatchStatusLabel,
  getOwnerMilestoneLabel,
  getOwnerPayoutStageLabel,
  getOwnerPayoutStatusLabel,
  getOwnerReadyStayStatusLabel,
  getOwnerRentalStatusLabel,
  getOwnerRewardStatusLabel,
  getOwnerVerificationStatusLabel,
  VERIFIED_MATCH_STATUSES,
  VERIFIED_MILESTONE_CODES,
  VERIFIED_OWNER_REWARD_STATUSES,
  VERIFIED_OWNER_VERIFICATION_STATUSES,
  VERIFIED_PAYOUT_STATUSES,
  VERIFIED_READY_STAY_STATUSES,
  VERIFIED_READY_STAY_VERIFICATION_STATUSES,
  VERIFIED_RENTAL_STATUSES,
} from "@/lib/owner/status-labels";

describe("owner status labels", () => {
  it("maps every verified payout status without exposing raw enums", () => {
    for (const status of VERIFIED_PAYOUT_STATUSES) {
      expect(getOwnerPayoutStatusLabel(status)).not.toBe(status);
    }
  });

  it("maps every verified rental status without exposing raw enums", () => {
    for (const status of VERIFIED_RENTAL_STATUSES) {
      expect(getOwnerRentalStatusLabel(status)).not.toBe(status);
    }
  });

  it("maps every verified match status without exposing raw enums", () => {
    for (const status of VERIFIED_MATCH_STATUSES) {
      expect(getOwnerMatchStatusLabel(status)).not.toBe(status);
    }
  });

  it("maps every verified milestone code without exposing raw enums", () => {
    for (const code of VERIFIED_MILESTONE_CODES) {
      expect(getOwnerMilestoneLabel(code)).not.toBe(code);
    }
  });

  it("maps every verified Ready Stay status without exposing raw enums", () => {
    for (const status of VERIFIED_READY_STAY_STATUSES) {
      expect(getOwnerReadyStayStatusLabel(status)).not.toBe(status);
    }
    for (const status of VERIFIED_READY_STAY_VERIFICATION_STATUSES) {
      expect(getOwnerReadyStayStatusLabel("draft", status)).not.toBe(status);
    }
  });

  it("maps every verified account and reward status without exposing raw enums", () => {
    for (const status of VERIFIED_OWNER_VERIFICATION_STATUSES) {
      expect(getOwnerVerificationStatusLabel(status)).not.toBe(status);
    }
    for (const status of VERIFIED_OWNER_REWARD_STATUSES) {
      expect(getOwnerRewardStatusLabel(status)).not.toBe(status);
    }
  });

  it("fails unknown statuses safely", () => {
    expect(getOwnerPayoutStatusLabel("scheduled")).toBe("Status unavailable");
    expect(getOwnerRentalStatusLabel("waiting_on_magic")).toBe("Status unavailable");
    expect(getOwnerPayoutStageLabel(10)).toBe("Payout stage unavailable");
    expect(getOwnerReadyStayStatusLabel("private_internal")).toBe("Status unavailable");
    expect(getOwnerVerificationStatusLabel("manual_review_pending")).toBe("Status unavailable");
  });

  it("uses Phase C1 owner-facing payout and match vocabulary", () => {
    expect(getOwnerPayoutStatusLabel("pending")).toBe("Pending");
    expect(getOwnerPayoutStatusLabel("eligible")).toBe("Ready for payout");
    expect(getOwnerPayoutStatusLabel("released")).toBe("Paid");
    expect(getOwnerPayoutStatusLabel("failed")).toBe("Payment issue");
    expect(getOwnerMatchStatusLabel("pending_owner")).toBe("Awaiting your response");
    expect(getOwnerMatchStatusLabel("booked")).toBe("Reservation created");
  });
});

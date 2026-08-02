import { describe, expect, it } from "vitest";

import {
  getOwnerMatchStatusLabel,
  getOwnerMilestoneLabel,
  getOwnerPayoutStageLabel,
  getOwnerPayoutStatusLabel,
  getOwnerRentalStatusLabel,
  VERIFIED_MATCH_STATUSES,
  VERIFIED_MILESTONE_CODES,
  VERIFIED_PAYOUT_STATUSES,
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

  it("fails unknown statuses safely", () => {
    expect(getOwnerPayoutStatusLabel("scheduled")).toBe("Status unavailable");
    expect(getOwnerRentalStatusLabel("waiting_on_magic")).toBe("Status unavailable");
    expect(getOwnerPayoutStageLabel(10)).toBe("Payout stage unavailable");
  });
});

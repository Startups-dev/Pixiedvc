import { describe, expect, it } from "vitest";

import { getMaxOwnerPayout, getStayGuestPriceCap } from "@/lib/ready-stays/ownerPricing";

describe("owner pricing overlap logic", () => {
  it("uses the strictest (lowest) guest cap across overlapping seasonal nights", () => {
    const cap = getStayGuestPriceCap({ checkIn: "2026-12-30", checkOut: "2027-01-10" });

    expect(cap.capDollars).toBe(35);
    expect(cap.seasonType).toBe("marathon");
  });

  it("computes max owner payout as cap minus fixed fee", () => {
    const maxOwner = getMaxOwnerPayout({ checkIn: "2026-12-30", checkOut: "2027-01-10" });
    expect(maxOwner).toBe(28);
  });
});

import { describe, expect, it } from "vitest";

import { computeCapsForStay } from "@/lib/ready-stays/pricingEngine";

describe("pricingEngine", () => {
  it("computes strictest and average caps across nights with resort modifier", () => {
    const result = computeCapsForStay({
      checkIn: "2026-12-30",
      checkOut: "2027-01-10",
      resortCalculatorCode: "VGF",
    });

    expect(result.strictestCapCents).toBe(3900);
    expect(result.strictestSeasonType).toBe("marathon");
    expect(result.averageCapCents).toBeGreaterThanOrEqual(result.strictestCapCents);
    expect(result.maxOwnerPayoutStrictestCents).toBe(3200);
  });
});

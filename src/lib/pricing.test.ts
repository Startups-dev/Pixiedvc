import { describe, expect, it } from "vitest";

import { computeOwnerPayout } from "@/lib/pricing";

describe("computeOwnerPayout", () => {
  it("includes the founding owner bonus in rate and total when active", () => {
    expect(
      computeOwnerPayout({
        totalPoints: 100,
        matchedMembershipResortId: "resort-1",
        bookingResortId: "resort-1",
        additionalBonusPerPointCents: 200,
      }),
    ).toMatchObject({
      owner_base_rate_per_point_cents: 1600,
      owner_premium_per_point_cents: 200,
      owner_bonus_per_point_cents: 200,
      owner_rate_per_point_cents: 2000,
      owner_total_cents: 200000,
      owner_home_resort_premium_applied: true,
      total_points_for_payout: 100,
    });
  });

  it("does not apply a missing or invalid bonus", () => {
    expect(
      computeOwnerPayout({
        totalPoints: 50,
        matchedMembershipResortId: "resort-1",
        bookingResortId: "resort-2",
        additionalBonusPerPointCents: null,
      }),
    ).toMatchObject({
      owner_bonus_per_point_cents: 0,
      owner_rate_per_point_cents: 1600,
      owner_total_cents: 80000,
      owner_home_resort_premium_applied: false,
      total_points_for_payout: 50,
    });
  });
});

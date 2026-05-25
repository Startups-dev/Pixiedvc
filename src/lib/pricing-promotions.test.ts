import { describe, expect, it } from "vitest";

import {
  getEffectivePromotionStatus,
  getFirstActivePromotionWithinWindow,
  type PricingPromotion,
} from "@/lib/pricing-promotions";

const basePromotion: PricingPromotion = {
  id: "promo-1",
  name: "Founders Launch",
  is_active: true,
  starts_at: null,
  ends_at: null,
  enrollment_required: true,
  guest_max_reward_per_point_cents: 200,
  owner_max_bonus_per_point_cents: 200,
  min_spread_per_point_cents: 200,
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("pricing promotion effective status", () => {
  it("treats an active promotion without a window as active", () => {
    const result = getEffectivePromotionStatus(basePromotion, new Date("2026-01-15T12:00:00.000Z"));
    expect(result.isEffectiveActive).toBe(true);
    expect(result.reason).toBe("active");
  });

  it("reports a future window as not yet started", () => {
    const result = getEffectivePromotionStatus(
      { ...basePromotion, starts_at: "2026-02-01T00:00:00.000Z" },
      new Date("2026-01-15T12:00:00.000Z"),
    );
    expect(result.isEffectiveActive).toBe(false);
    expect(result.reason).toBe("starts_in_future");
  });

  it("reports an expired window as ended", () => {
    const result = getEffectivePromotionStatus(
      { ...basePromotion, ends_at: "2026-01-10T00:00:00.000Z" },
      new Date("2026-01-15T12:00:00.000Z"),
    );
    expect(result.isEffectiveActive).toBe(false);
    expect(result.reason).toBe("ended");
  });

  it("selects the first active promotion that is within window", () => {
    const result = getFirstActivePromotionWithinWindow(
      [
        { ...basePromotion, id: "promo-2", created_at: "2026-01-03T00:00:00.000Z", starts_at: "2026-02-01T00:00:00.000Z" },
        { ...basePromotion, id: "promo-1", created_at: "2026-01-02T00:00:00.000Z" },
      ],
      new Date("2026-01-15T12:00:00.000Z"),
    );

    expect(result?.id).toBe("promo-1");
  });
});

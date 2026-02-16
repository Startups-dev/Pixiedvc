import { describe, expect, it } from "vitest";

import { applyOwnerBonusWithMargin } from "./owner-rewards";

describe("applyOwnerBonusWithMargin", () => {
  it("keeps full owner bonus when spread supports it", () => {
    const applied = applyOwnerBonusWithMargin({
      owner_bonus_candidate_cents: 200,
      owner_max_bonus_cents: 200,
      guest_reward_per_point_cents: 200,
      spread_per_point_cents: 700,
      min_spread_per_point_cents: 200,
    });

    expect(applied).toBe(200);
  });

  it("reduces owner bonus to preserve minimum spread", () => {
    const applied = applyOwnerBonusWithMargin({
      owner_bonus_candidate_cents: 200,
      owner_max_bonus_cents: 200,
      guest_reward_per_point_cents: 200,
      spread_per_point_cents: 500,
      min_spread_per_point_cents: 200,
    });

    expect(applied).toBe(100);
  });
});

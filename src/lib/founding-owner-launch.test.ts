import { describe, expect, it } from "vitest";

import {
  isFoundingOwnerLaunchPromotion,
  normalizePromotionName,
} from "@/lib/founding-owner-launch";

describe("founding owner launch promotion matching", () => {
  it("normalizes common name variants", () => {
    expect(normalizePromotionName("Founders Launch")).toBe("founders launch");
    expect(normalizePromotionName("Founding Owner Launch")).toBe("founding owner launch");
    expect(normalizePromotionName("founders-launch")).toBe("founders launch");
    expect(normalizePromotionName(" founders launch ")).toBe("founders launch");
    expect(normalizePromotionName("FOUNDERS LAUNCH")).toBe("founders launch");
  });

  it("matches founders launch variants", () => {
    expect(isFoundingOwnerLaunchPromotion({ name: "Founders Launch" } as never)).toBe(true);
    expect(isFoundingOwnerLaunchPromotion({ name: "Founding Owner Launch" } as never)).toBe(true);
    expect(isFoundingOwnerLaunchPromotion({ name: "founders-launch" } as never)).toBe(true);
    expect(isFoundingOwnerLaunchPromotion({ name: " founders launch " } as never)).toBe(true);
    expect(isFoundingOwnerLaunchPromotion({ name: "FOUNDERS LAUNCH" } as never)).toBe(true);
  });
});

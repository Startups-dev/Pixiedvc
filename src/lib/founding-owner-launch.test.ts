import { describe, expect, it } from "vitest";

import {
  getFoundingOwnerEnrollmentCopy,
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

describe("Founding Owner enrollment copy", () => {
  it("uses saved timestamps and Eastern daylight saving time", () => {
    expect(getFoundingOwnerEnrollmentCopy({
      starts_at: "2026-10-15T08:56:00+00:00",
      ends_at: "2026-12-31T23:59:00+00:00",
    })).toEqual({
      badge: "OCT 15–DEC 31, 2026",
      eligibility: "Available to qualifying owners who join between October 15 and December 31, 2026.",
      timing: "Enroll by December 31, 2026 at 6:59 PM EST.",
    });
  });

  it("formats a year-crossing range and reflects changed dates", () => {
    expect(getFoundingOwnerEnrollmentCopy({
      starts_at: "2026-12-15T09:00:00Z",
      ends_at: "2027-01-15T23:59:00Z",
    })).toEqual({
      badge: "DEC 15, 2026–JAN 15, 2027",
      eligibility: "Available to qualifying owners who join between December 15, 2026 and January 15, 2027.",
      timing: "Enroll by January 15, 2027 at 6:59 PM EST.",
    });
  });

  it("distinguishes repeated local times on the daylight saving transition", () => {
    const copy = getFoundingOwnerEnrollmentCopy({
      starts_at: "2026-11-01T05:30:00Z",
      ends_at: "2026-11-01T06:30:00Z",
    });
    expect(copy.timing).toBe("Enroll by November 1, 2026 at 1:30 AM EST.");
  });

  it("shows saved seconds instead of rounding the closing boundary", () => {
    const copy = getFoundingOwnerEnrollmentCopy({
      starts_at: null,
      ends_at: "2026-12-31T23:59:30.500Z",
    });
    expect(copy.timing).toBe("Enroll by December 31, 2026 at 6:59:30.500 PM EST.");
  });

  it("handles each missing schedule boundary", () => {
    expect(getFoundingOwnerEnrollmentCopy({ starts_at: "2026-10-15T08:56:00Z", ends_at: null })).toEqual({
      badge: "FROM OCT 15, 2026",
      eligibility: "Available to qualifying owners who join from October 15, 2026.",
      timing: "Enrollment opens October 15, 2026 at 4:56 AM EDT (Eastern Time).",
    });
    expect(getFoundingOwnerEnrollmentCopy({ starts_at: null, ends_at: "2026-12-31T23:59:00Z" })).toEqual({
      badge: "THROUGH DEC 31, 2026",
      eligibility: "Available to qualifying owners who join by December 31, 2026 at 6:59 PM EST (Eastern Time).",
      timing: "Enroll by December 31, 2026 at 6:59 PM EST.",
    });
    expect(getFoundingOwnerEnrollmentCopy({ starts_at: null, ends_at: null })).toEqual({
      badge: "ENROLLMENT OPEN",
      eligibility: "Available to qualifying owners who join while this promotion is active.",
      timing: null,
    });
  });
});

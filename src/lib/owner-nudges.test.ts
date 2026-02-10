import { describe, expect, it, vi } from "vitest";

import { getMembershipNudge } from "./owner-nudges";

describe("getMembershipNudge", () => {
  it("returns banking nudge at 30-day window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T00:00:00Z"));

    const nudge = getMembershipNudge({
      use_year_start: "2026-02-01",
      use_year_end: "2027-01-31",
    });

    expect(nudge?.stage).toBe("banking");
    expect(nudge?.tier.label).toBe("Bank soon");
    vi.useRealTimers();
  });

  it("returns last-week banking nudge at 7-day window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T00:00:00Z"));

    const nudge = getMembershipNudge({
      use_year_start: "2026-02-01",
      use_year_end: "2027-01-31",
    });

    expect(nudge?.stage).toBe("banking");
    expect(nudge?.tier.label).toBe("Last week");
    vi.useRealTimers();
  });

  it("returns expiration nudge after banking closes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T00:00:00Z"));

    const nudge = getMembershipNudge({
      use_year_start: "2026-02-01",
      use_year_end: "2027-01-31",
    });

    expect(nudge?.stage).toBe("expiration");
    expect(nudge?.tier.label).toBe("Heads up");
    vi.useRealTimers();
  });
});

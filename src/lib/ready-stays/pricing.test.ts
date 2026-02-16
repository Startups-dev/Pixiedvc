import { describe, expect, it } from "vitest";

import { getReadyStayPricingBand, getReadyStaySeason } from "@/lib/ready-stays/pricing";

describe("ready stay pricing band", () => {
  it("classifies seasonal windows with precedence", () => {
    expect(getReadyStaySeason("2026-01-02")).toBe("christmas");
    expect(getReadyStaySeason("2026-01-10")).toBe("marathon");
    expect(getReadyStaySeason("2026-10-10")).toBe("halloween");
    expect(getReadyStaySeason("2026-03-10")).toBe("spring_break");
    expect(getReadyStaySeason("2026-05-20")).toBe("high");
    expect(getReadyStaySeason("2026-09-15")).toBe("normal");
  });

  it("returns pricing band values for a season", () => {
    const band = getReadyStayPricingBand({ check_in: "2026-12-20" });
    expect(band.seasonType).toBe("christmas");
    expect(band.minOwnerCents).toBe(2800);
    expect(band.suggestedOwnerCents).toBe(3000);
    expect(band.maxOwnerCents).toBe(3100);
    expect(band.guestCapCents).toBe(3800);
  });
});

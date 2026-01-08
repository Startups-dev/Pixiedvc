import { describe, expect, it } from "vitest";

import { scoreSupportMatches } from "./retrieval";

describe("scoreSupportMatches", () => {
  it("returns low confidence when no matches", () => {
    const result = scoreSupportMatches([]);
    expect(result.confidence).toBe("low");
    expect(result.handoffSuggested).toBe(true);
  });

  it("returns high confidence for strong match", () => {
    const result = scoreSupportMatches([
      {
        slug: "pricing-payments",
        title: "Pricing and Payments",
        category: "Pricing & Payments",
        content: "Pricing is based on points.",
        similarity: 0.9,
      },
    ]);
    expect(result.confidence).toBe("high");
    expect(result.handoffSuggested).toBe(false);
  });

  it("returns low confidence when match is weak", () => {
    const result = scoreSupportMatches([
      {
        slug: "booking-availability",
        title: "Booking Availability Overview",
        category: "Booking & Availability",
        content: "Availability depends on windows.",
        similarity: 0.76,
      },
    ]);
    expect(result.confidence).toBe("low");
    expect(result.handoffSuggested).toBe(true);
  });
});

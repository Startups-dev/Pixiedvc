import { describe, expect, it } from "vitest";

import { calculateStayPoints } from "@/lib/stay/stayCalculator";

describe("stayCalculator", () => {
  it("expands nights as check-in inclusive and check-out exclusive", () => {
    const result = calculateStayPoints({
      resortCalculatorCode: "VGF",
      roomType: "Studio",
      checkIn: "2026-12-24",
      checkOut: "2026-12-26",
    });

    expect(result.totalNights).toBe(2);
    expect(result.nights).toHaveLength(2);
    expect(result.nights[0]?.night).toBe("2026-12-24");
    expect(result.nights[1]?.night).toBe("2026-12-25");
    expect(result.totalPoints).toBe(result.nights.reduce((sum, row) => sum + row.points, 0));
  });

  it("treats invalid checkout as a one-night stay", () => {
    const result = calculateStayPoints({
      resortCalculatorCode: "VGF",
      roomType: "Studio",
      checkIn: "2026-12-24",
      checkOut: "2026-12-24",
    });

    expect(result.totalNights).toBe(1);
    expect(result.nights).toHaveLength(1);
    expect(result.nights[0]?.night).toBe("2026-12-24");
  });
});

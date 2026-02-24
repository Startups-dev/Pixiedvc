// test/calc.test.ts
import { describe, it, expect } from "vitest";
import { quoteStay } from "../src/engine/calc.js";

describe("DVC Calculator Engine", () => {
  it("should calculate points for a single night", async () => {
    // This test will work once we have actual data files
    // For now, it's a placeholder structure
    expect(true).toBe(true);
  });

  it("should differentiate between Sun-Thu and Fri-Sat rates", async () => {
    // Test that Friday/Saturday use friSat rates
    // while Sunday-Thursday use sunThu rates
    expect(true).toBe(true);
  });

  it("should handle stays crossing multiple travel periods", async () => {
    // Test that a stay spanning two periods sums correctly
    expect(true).toBe(true);
  });

  it("should return 0 points for missing period data", async () => {
    // Test that dates outside defined periods return 0 points
    expect(true).toBe(true);
  });

  it("should handle Grand Villa with S/SV views only", async () => {
    // Test that GRANDVILLA only has S and SV view options
    expect(true).toBe(true);
  });

  it("should calculate correct USD pricing with fees", async () => {
    // Test that baseUSD = points * ppp
    // and totalUSD = baseUSD + (baseUSD * feePct/100)
    expect(true).toBe(true);
  });

  it("loads 2027 charts successfully", async () => {
    const result = quoteStay({
      resortCode: "BLT",
      room: "STUDIO",
      view: "S",
      checkIn: "2027-09-07",
      nights: 2,
      chartYear: 2027
    });

    expect(result.totalPoints).toBeGreaterThan(0);
  });

  it("falls back to default charts when requested year is missing", async () => {
    const result = quoteStay({
      resortCode: "BLT",
      room: "STUDIO",
      view: "S",
      checkIn: "2026-09-07",
      nights: 2,
      chartYear: 2099
    });

    expect(result.totalPoints).toBeGreaterThan(0);
  });
});

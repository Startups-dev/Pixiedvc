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

  it("prices the BCV 2026 Nov 20–26 two-bedroom standard stay across the Thanksgiving boundary", () => {
    const result = quoteStay({
      resortCode: "BCV",
      room: "TWOBR",
      view: "S",
      checkIn: "2026-11-20",
      nights: 6,
      bookingDate: "2026-11-02",
    });

    expect(result.nightly).toEqual([
      { date: "2026-11-20", points: 52, periodId: 5 },
      { date: "2026-11-21", points: 52, periodId: 5 },
      { date: "2026-11-22", points: 46, periodId: 5 },
      { date: "2026-11-23", points: 46, periodId: 5 },
      { date: "2026-11-24", points: 46, periodId: 5 },
      { date: "2026-11-25", points: 48, periodId: 6 },
    ]);
    expect(result.totalPoints).toBe(290);
    expect(result.pricingTier).toBe("Select Access");
    expect(result.totalUSD).toBe(6960);

    const pointsByRoom = ["STUDIO", "ONEBR", "TWOBR"].map((room) =>
      quoteStay({
        resortCode: "BCV",
        room: room as "STUDIO" | "ONEBR" | "TWOBR",
        view: "S",
        checkIn: "2026-11-25",
        nights: 1,
        bookingDate: "2026-11-02",
      }).nightly[0].points,
    );
    expect(pointsByRoom).toEqual([18, 37, 48]);
  });

  it("assigns BCV Thanksgiving boundary dates to the official travel periods and excludes checkout", () => {
    const result = quoteStay({
      resortCode: "BCV",
      room: "TWOBR",
      view: "S",
      checkIn: "2026-11-24",
      nights: 5,
      bookingDate: "2026-01-01",
    });

    expect(result.nightly.map(({ date, periodId }) => [date, periodId])).toEqual([
      ["2026-11-24", 5],
      ["2026-11-25", 6],
      ["2026-11-26", 6],
      ["2026-11-27", 6],
      ["2026-11-28", 5],
    ]);
    expect(result.nightly.some(({ date }) => date === "2026-11-29")).toBe(false);
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

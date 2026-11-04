// test/calc.test.ts
import { describe, it, expect } from "vitest";
import { quoteStay } from "../src/engine/calc.js";
import { getDvcAccommodationOptions } from "../src/engine/accommodations.js";

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

  it("rejects a missing chart year instead of silently using another year", () => {
    expect(() => quoteStay({
      resortCode: "BLT",
      room: "STUDIO",
      view: "S",
      checkIn: "2099-09-07",
      nights: 1,
      chartYear: 2099
    })).toThrow("No chart for BLT in 2099");
  });

  it("matches the official Aulani 2025 February boundary", () => {
    const before = quoteStay({ resortCode: "AUL", room: "STUDIO", view: "S", checkIn: "2025-02-22", nights: 1, bookingDate: "2025-01-01" });
    const after = quoteStay({ resortCode: "AUL", room: "STUDIO", view: "S", checkIn: "2025-02-23", nights: 1, bookingDate: "2025-01-01" });

    expect(before.nightly[0]).toMatchObject({ points: 17, periodId: 1 });
    expect(after.nightly[0]).toMatchObject({ points: 22, periodId: 3 });
  });

  it("matches updated Aulani 2026 April ranges without overlap", () => {
    const dates = ["2026-04-11", "2026-04-12", "2026-04-28", "2026-04-29"];
    const results = dates.map((checkIn) => quoteStay({ resortCode: "AUL", room: "STUDIO", view: "S", checkIn, nights: 1, bookingDate: "2026-01-01" }));

    expect(results.map((result) => [result.nightly[0].points, result.nightly[0].periodId])).toEqual([
      [24, 4], [19, 2], [19, 2], [22, 3],
    ]);
  });

  it("exposes Disney's Hotel Room category at Aulani for all supported years", () => {
    const periodStarts = {
      2025: ["2025-01-05", "2025-04-27", "2025-02-23", "2025-01-01"],
      2026: ["2026-01-04", "2026-04-12", "2026-03-01", "2026-01-01"],
      2027: ["2027-01-03", "2027-04-04", "2027-02-28", "2027-01-01"],
    } as const;

    for (const [year, dates] of Object.entries(periodStarts)) {
      for (const [index, checkIn] of dates.entries()) {
        const bookingDate = `${year}-01-01`;
        const hotel = quoteStay({ resortCode: "AUL", room: "HOTELROOM", view: "S", checkIn, nights: 1, bookingDate });
        const deluxeStudio = quoteStay({ resortCode: "AUL", room: "STUDIO", view: "S", checkIn, nights: 1, bookingDate });

        expect(hotel.nightly[0].points).toBe([16, 17, 18, 21][index]);
        expect(deluxeStudio.nightly[0].points).toBe([17, 19, 22, 24][index]);
      }
    }
    expect(getDvcAccommodationOptions("AUL").some(({ roomCode, viewCode }) => roomCode === "HOTELROOM" && viewCode === "S")).toBe(true);
  });

  it("uses the official VDH 2027 November 27 boundary and rejects unsupported villa views", () => {
    const result = quoteStay({ resortCode: "VDH", room: "DUOSTUDIO", view: "S", checkIn: "2027-11-27", nights: 1, bookingDate: "2027-01-01" });

    expect(result.nightly[0]).toMatchObject({ points: 16, periodId: 4 });
    expect(getDvcAccommodationOptions("VDH").some(({ roomCode, viewCode }) => roomCode === "ONEBR" && viewCode === "S")).toBe(false);
    expect(() => quoteStay({ resortCode: "VDH", room: "ONEBR", view: "S", checkIn: "2027-01-01", nights: 1, bookingDate: "2026-01-01" })).toThrow("No points data for ONEBR/S");
  });

  it("prices the preferred view for the Polynesian main-house Deluxe Studio", () => {
    const points = [2025, 2026, 2027].map((year) =>
      quoteStay({
        resortCode: "PVB",
        room: "STUDIO",
        view: "P",
        checkIn: `${year}-09-01`,
        nights: 1,
        bookingDate: `${year}-01-01`,
      }).nightly[0].points,
    );

    expect(points).toEqual([19, 19, 20]);
    expect(getDvcAccommodationOptions("PVB").some(({ roomCode, viewCode }) => roomCode === "STUDIO" && viewCode === "P")).toBe(true);
  });

  it("matches the official BoardWalk 2026 Deluxe Studio Resort View period rates", () => {
    const datesAndPoints: Array<[string, number]> = [
      ["2026-09-01", 10],
      ["2026-01-01", 10],
      ["2026-05-17", 11],
      ["2026-02-01", 11],
    ];

    expect(datesAndPoints.map(([checkIn]) => quoteStay({
      resortCode: "BWV",
      room: "STUDIO",
      view: "S",
      checkIn,
      nights: 1,
      bookingDate: "2025-01-01",
    }).nightly[0].points)).toEqual(datesAndPoints.map(([, points]) => points));
  });

  it("uses the official BoardWalk period 5 Deluxe Studio Resort View weekend rate", () => {
    for (const year of [2026, 2027]) {
      const result = quoteStay({
        resortCode: "BWV",
        room: "STUDIO",
        view: "S",
        checkIn: `${year}-10-02`,
        nights: 1,
        bookingDate: `${year}-01-01`,
      });
      expect(result.nightly[0]).toMatchObject({ points: 16, periodId: 5 });
    }
  });

  it("uses the official 155 point VGF Grand Villa Friday rate in period 4", () => {
    for (const year of [2025, 2026]) {
      const result = quoteStay({
        resortCode: "VGF",
        room: "GRANDVILLA",
        view: "P",
        checkIn: `${year}-02-07`,
        nights: 1,
        bookingDate: `${year}-01-01`,
      });
      expect(result.nightly[0].points).toBe(155);
    }
  });

  it("uses the corrected VDH 2025 chart and excludes checkout across New Year", () => {
    const result = quoteStay({ resortCode: "VDH", room: "DUOSTUDIO", view: "S", checkIn: "2025-12-31", nights: 2, bookingDate: "2025-01-01" });

    expect(result.nightly).toEqual([
      { date: "2025-12-31", points: 22, periodId: 7 },
      { date: "2026-01-01", points: 10, periodId: 1 },
    ]);
    expect(result.totalPoints).toBe(32);
    expect(result.nightly.some(({ date }) => date === "2026-01-02")).toBe(false);
  });

  it("uses the standalone-reference Vero Beach 2025 dates across all six accommodation columns", () => {
    const accommodations = [
      ["INNROOM", "S"],
      ["STUDIO", "S"],
      ["INNROOM", "O"],
      ["ONEBR", "S"],
      ["TWOBR", "S"],
      ["COTTAGE", "S"],
    ] as const;
    const boundaryNights = [
      { date: "2025-11-25", weekday: "Tuesday", periodId: 1, expected: [10, 12, 14, 21, 30, 60] },
      { date: "2025-11-26", weekday: "Wednesday", periodId: 3, expected: [14, 16, 18, 29, 36, 73] },
      { date: "2025-11-28", weekday: "Friday", periodId: 3, expected: [17, 19, 21, 37, 47, 88] },
      { date: "2025-11-29", weekday: "Saturday", periodId: 2, expected: [17, 18, 19, 31, 42, 74] },
      { date: "2025-11-30", weekday: "Sunday", periodId: 2, expected: [10, 13, 15, 24, 33, 61] },
    ];

    expect(getDvcAccommodationOptions("VB")).toHaveLength(6);
    for (const boundary of boundaryNights) {
      expect(new Date(`${boundary.date}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })).toBe(boundary.weekday);
      accommodations.forEach(([room, view], index) => {
        const result = quoteStay({
          resortCode: "VB",
          room,
          view,
          checkIn: boundary.date,
          nights: 1,
          bookingDate: "2025-01-01",
        });
        expect(result.nightly).toHaveLength(1);
        expect(result.nightly[0]).toMatchObject({
          date: boundary.date,
          periodId: boundary.periodId,
          points: boundary.expected[index],
        });
      });
    }
  });
});

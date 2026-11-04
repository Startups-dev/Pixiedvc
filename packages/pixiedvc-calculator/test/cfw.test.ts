import { describe, expect, it } from "vitest";

import { getDvcAccommodationOptions } from "../src/engine/accommodations.js";
import { quoteStay } from "../src/engine/calc.js";
import { Resorts, loadResortYearChart } from "../src/engine/charts.js";

const range = (start: string, end: string) => ({ start, end });

const officialCharts = {
  2025: [
    [[range("2025-09-01", "2025-09-30")], 15, 18],
    [[range("2025-01-01", "2025-01-31"), range("2025-05-01", "2025-05-14")], 16, 19],
    [[range("2025-05-15", "2025-06-10"), range("2025-12-01", "2025-12-23")], 18, 21],
    [[range("2025-02-01", "2025-02-15"), range("2025-06-11", "2025-08-31")], 20, 24],
    [[range("2025-10-01", "2025-11-25"), range("2025-11-29", "2025-11-30")], 22, 25],
    [[range("2025-02-16", "2025-04-12"), range("2025-04-21", "2025-04-30"), range("2025-11-26", "2025-11-28")], 24, 28],
    [[range("2025-04-13", "2025-04-20"), range("2025-12-24", "2025-12-31")], 32, 36],
  ],
  2026: [
    [[range("2026-09-01", "2026-09-30")], 15, 18],
    [[range("2026-01-01", "2026-01-31"), range("2026-05-01", "2026-05-14")], 16, 19],
    [[range("2026-05-15", "2026-06-10"), range("2026-12-01", "2026-12-23")], 18, 21],
    [[range("2026-02-01", "2026-02-15"), range("2026-06-11", "2026-08-31")], 20, 24],
    [[range("2026-10-01", "2026-11-24"), range("2026-11-28", "2026-11-30")], 22, 25],
    [[range("2026-02-16", "2026-03-28"), range("2026-04-06", "2026-04-30"), range("2026-11-25", "2026-11-27")], 24, 28],
    [[range("2026-03-29", "2026-04-05"), range("2026-12-24", "2026-12-31")], 32, 36],
  ],
  2027: [
    [[range("2027-09-01", "2027-09-30")], 15, 18],
    [[range("2027-01-01", "2027-01-31"), range("2027-05-01", "2027-05-14")], 16, 19],
    [[range("2027-05-15", "2027-06-10"), range("2027-12-01", "2027-12-23")], 18, 21],
    [[range("2027-02-01", "2027-02-15"), range("2027-06-11", "2027-08-31")], 20, 24],
    [[range("2027-10-01", "2027-11-23"), range("2027-11-27", "2027-11-30")], 22, 25],
    [[range("2027-02-16", "2027-03-20"), range("2027-03-29", "2027-04-30"), range("2027-11-24", "2027-11-26")], 24, 28],
    [[range("2027-03-21", "2027-03-28"), range("2027-12-24", "2027-12-31")], 32, 36],
  ],
} as const;

describe("Fort Wilderness official points charts", () => {
  it("matches every travel period, cabin rate, and weekly total in Disney's official charts", () => {
    for (const year of [2025, 2026, 2027] as const) {
      const chart = loadResortYearChart("CFW", year);
      expect(chart, `missing official CFW ${year} chart`).not.toBeNull();
      expect(chart?.periods).toHaveLength(7);

      officialCharts[year].forEach(([ranges, sunThu, friSat], index) => {
        expect(chart?.periods[index]).toMatchObject({
          id: index + 1,
          ranges,
          points: { CABIN: { S: { sunThu, friSat } } },
        });
        expect(sunThu * 5 + friSat * 2).toBe([111, 118, 132, 148, 160, 176, 232][index]);
      });
    }
  });

  it("exposes only the official Cabin option with six-person capacity", () => {
    expect(Resorts.find(({ code }) => code === "CFW")).toMatchObject({
      category: "SELECT_ACCESS",
      roomTypes: ["CABIN"],
      viewsByRoom: { CABIN: ["S"] },
      occupancy: { CABIN: 6 },
    });
    expect(getDvcAccommodationOptions("CFW")).toMatchObject([
      { resortCode: "CFW", roomCode: "CABIN", viewCode: "S", roomLabel: "Cabin" },
    ]);
  });

  it("prices boundary nights from the correct official period and weekday rate", () => {
    const cases = [
      [2025, "2025-11-25", 5, 22], [2025, "2025-11-26", 6, 24], [2025, "2025-11-28", 6, 28], [2025, "2025-11-29", 5, 25],
      [2026, "2026-11-24", 5, 22], [2026, "2026-11-25", 6, 24], [2026, "2026-11-27", 6, 28], [2026, "2026-11-28", 5, 25],
      [2027, "2027-11-23", 5, 22], [2027, "2027-11-24", 6, 24], [2027, "2027-11-26", 6, 28], [2027, "2027-11-27", 5, 25],
      [2026, "2026-03-28", 6, 28], [2026, "2026-03-29", 7, 32], [2026, "2026-04-05", 7, 32], [2026, "2026-04-06", 6, 24],
    ] as const;

    for (const [year, date, periodId, points] of cases) {
      expect(quoteStay({ resortCode: "CFW", room: "CABIN", view: "S", checkIn: date, nights: 1, bookingDate: `${year - 1}-01-01` }).nightly[0])
        .toMatchObject({ date, periodId, points });
    }
  });

  it("uses each year's chart across New Year and excludes checkout", () => {
    const stays = [
      { checkIn: "2025-12-31", nights: 2, expected: [{ date: "2025-12-31", points: 32, periodId: 7 }, { date: "2026-01-01", points: 16, periodId: 2 }] },
      { checkIn: "2026-12-31", nights: 2, expected: [{ date: "2026-12-31", points: 32, periodId: 7 }, { date: "2027-01-01", points: 19, periodId: 2 }] },
    ] as const;

    for (const stay of stays) {
      const result = quoteStay({ resortCode: "CFW", room: "CABIN", view: "S", checkIn: stay.checkIn, nights: stay.nights, bookingDate: `${stay.checkIn.slice(0, 4)}-01-01` });
      expect(result.nightly).toEqual(stay.expected);
      expect(result.totalPoints).toBe(stay.expected.reduce((sum, night) => sum + night.points, 0));
      expect(result.pppUSD).toBe(24);
      expect(result.pricingTier).toBe("Select Access");
      expect(result.nightly.some(({ date }) => date === "2026-01-02" || date === "2027-01-02")).toBe(false);
    }
  });
});

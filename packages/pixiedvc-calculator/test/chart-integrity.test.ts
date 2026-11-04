import { describe, expect, it } from "vitest";
import { Resorts, loadResortYearChart } from "../src/engine/charts.js";
import { quoteStay } from "../src/engine/calc.js";

function isoDate(year: number, dayOfYear: number) {
  return new Date(Date.UTC(year, 0, dayOfYear)).toISOString().slice(0, 10);
}

describe("registered annual DVC chart integrity", () => {
  for (const year of [2025, 2026, 2027]) {
    for (const resort of Resorts) {
      it(`${resort.code} ${year} covers each day exactly once with every listed accommodation rate`, () => {
        const chart = loadResortYearChart(resort.code, year);
        expect(chart, `missing ${resort.code} ${year} chart`).not.toBeNull();
        if (!chart) return;

        const dayCount = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
        for (let day = 1; day <= dayCount; day += 1) {
          const date = isoDate(year, day);
          const matches = chart.periods.filter((period) =>
            period.ranges.some((range) => range.start <= date && date <= range.end),
          );
          expect(matches, `${resort.code} ${year} ${date} period count`).toHaveLength(1);

          for (const period of matches) {
            for (const { roomCode, viewCode } of resort.roomTypes.flatMap((room) =>
              (resort.viewsByRoom[room] ?? []).map((view) => ({ roomCode: room, viewCode: view })),
            )) {
              const rate = period.points[roomCode]?.[viewCode];
              expect(rate, `${resort.code} ${year} ${date} ${roomCode}/${viewCode}`).toMatchObject({
                sunThu: expect.any(Number),
                friSat: expect.any(Number),
              });

              const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
              const expectedPoints = dayOfWeek === 5 || dayOfWeek === 6 ? rate!.friSat : rate!.sunThu;
              const quote = quoteStay({
                resortCode: resort.code,
                room: roomCode,
                view: viewCode,
                checkIn: date,
                nights: 1,
                bookingDate: `${year - 1}-01-01`,
              });
              expect(quote.nightly, `${resort.code} ${year} ${date} ${roomCode}/${viewCode} checkout exclusion`).toHaveLength(1);
              expect(quote.nightly[0], `${resort.code} ${year} ${date} ${roomCode}/${viewCode} engine quote`).toMatchObject({
                date,
                points: expectedPoints,
                periodId: period.id,
              });
            }
          }
        }
      });
    }
  }
});

// src/engine/calc.ts
import { addDays, differenceInMonths, formatISO, isWithinInterval, parseISO } from "./date-utils";
import type { QuoteInput, QuoteResult, ResortYearChart, RoomCode, ViewCode } from "./types";
import { loadResortYearChart, Resorts } from "./charts";
import { RATE_BY_CATEGORY, SERVICE_FEE_PCT, TIER_DISPLAY_NAMES } from "./rates";

function calculatePricePerPoint(resortCode: string, checkInDate: string, bookingDate?: string): { ppp: number; tierName: string } {
  const meta = Resorts.find(r => r.code === resortCode);
  if (!meta) throw new Error(`Unknown resort ${resortCode}`);

  // Year-round tiers stay fixed regardless of booking window.
  if (meta.category === "SELECT_ACCESS" || meta.category === "VALUE_ACCESS") {
    return {
      ppp: RATE_BY_CATEGORY[meta.category],
      tierName: TIER_DISPLAY_NAMES[meta.category]
    };
  }

  // Premier / Priority access tiers upgrade only when secured 7-11 months in advance.
  const checkIn = parseISO(checkInDate);
  const bookingDateParsed = bookingDate ? parseISO(bookingDate) : new Date();
  const monthsInAdvance = differenceInMonths(checkIn, bookingDateParsed);

  if (monthsInAdvance < 7) {
    return {
      ppp: RATE_BY_CATEGORY.SELECT_ACCESS,
      tierName: TIER_DISPLAY_NAMES.SELECT_ACCESS
    };
  }

  return {
    ppp: RATE_BY_CATEGORY[meta.category],
    tierName: TIER_DISPLAY_NAMES[meta.category]
  };
}

function findResortCategory(resortCode: string) {
  const meta = Resorts.find(r => r.code === resortCode);
  if (!meta) throw new Error(`Unknown resort ${resortCode}`);
  return { meta, ppp: RATE_BY_CATEGORY[meta.category] };
}

function periodForDate(chart: ResortYearChart, iso: string) {
  const d = parseISO(iso);
  for (const p of chart.periods) {
    for (const r of p.ranges) {
      const s = parseISO(r.start), e = parseISO(r.end);
      if (isWithinInterval(d, { start: s, end: e })) return p;
    }
  }
  return null;
}

function pointsForNight(period: any, room: string, view: string, iso: string) {
  if (!period) return 0;
  const rate = period.points?.[room]?.[view];
  if (!rate) return 0;
  const dow = parseISO(iso).getDay(); // 0 Sun .. 6 Sat
  const isFriSat = dow === 5 || dow === 6;
  return isFriSat ? rate.friSat : rate.sunThu;
}

export function quoteStay(input: QuoteInput): QuoteResult {
  const { resortCode, room, view, checkIn, nights, bookingDate } = input;

  // Calculate the guest access tier based on resort category and booking window.
  const { ppp, tierName } = calculatePricePerPoint(resortCode, checkIn, bookingDate);

  let totalPoints = 0;
  const nightly: QuoteResult["nightly"] = [];
  const chartCache = new Map<number, ResortYearChart>();

  for (let i = 0; i < nights; i++) {
    const iso = formatISO(addDays(parseISO(checkIn), i), { representation: "date" });
    const chartYear = Number(iso.slice(0, 4));
    let chart = chartCache.get(chartYear);
    if (!chart) {
      chart = loadResortYearChart(resortCode, chartYear);
      if (!chart) {
        throw new Error(`No chart for ${resortCode} in ${chartYear}`);
      }
      chartCache.set(chartYear, chart);
    }
    const period = periodForDate(chart, iso);
    if (!period) {
      throw new Error(`No travel period found for date ${iso} at ${resortCode}`);
    }
    const pts = pointsForNight(period, room, view, iso);
    if (pts === 0) {
      throw new Error(`No points data for ${room}/${view} on ${iso} at ${resortCode}`);
    }
    totalPoints += pts;
    nightly.push({ date: iso, points: pts, periodId: period?.id ?? null });
  }

  const baseUSD = totalPoints * ppp;
  const feeUSD = baseUSD * (SERVICE_FEE_PCT / 100);
  const totalUSD = baseUSD + feeUSD;

  return {
    totalPoints,
    nightly,
    pppUSD: ppp,
    feePct: SERVICE_FEE_PCT,
    baseUSD: Number(baseUSD.toFixed(2)),
    feeUSD: Number(feeUSD.toFixed(2)),
    totalUSD: Number(totalUSD.toFixed(2)),
    pricingTier: tierName,
  };
}

/** For "show all resorts" table: compute STUDIO/ONEBR/TWOBR/GRAND totals per resort */
export async function quoteAllResorts(params: Omit<QuoteInput, "resortCode" | "room" | "view"> & {
  roomViews: Partial<Record<string, { room: RoomCode; view: ViewCode }[]>>;
}) {
  const results: Record<string, any> = {};
  for (const r of Resorts) {
    const combos = params.roomViews[r.code] ?? [{ room: "STUDIO", view: "S" }];
    results[r.code] = {};
    for (const combo of combos) {
        results[r.code][`${combo.room}`] = await quoteStay({
          resortCode: r.code,
          room: combo.room,
          view: combo.view,
          checkIn: params.checkIn,
          nights: params.nights,
          year: params.year,
          chartYear: params.chartYear
        });
      }
  }
  return results;
}

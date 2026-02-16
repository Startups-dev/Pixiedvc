import { getReadyStayPricingBand } from "@/lib/ready-stays/pricing";
import { getResortModifierDollars } from "@/lib/ready-stays/resortModifiers";

const DOLLARS_TO_CENTS = 100;

export const FEE_PER_POINT = 7;
export const FEE_PER_POINT_CENTS = FEE_PER_POINT * DOLLARS_TO_CENTS;

function parseYmdToUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getNightDates(checkIn: string, checkOut?: string | null) {
  const start = parseYmdToUtcDate(checkIn);
  const end = checkOut ? parseYmdToUtcDate(checkOut) : null;

  if (!end || Number.isNaN(end.getTime()) || end <= start) return [formatUtcDate(start)];

  const nights: string[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    nights.push(formatUtcDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights.length ? nights : [formatUtcDate(start)];
}

export type NightCapRow = {
  night: string;
  seasonType: string;
  baseCapCents: number;
  resortModifierCents: number;
  finalCapCents: number;
};

export type CapSummary = {
  nights: NightCapRow[];
  strictestCapCents: number;
  averageCapCents: number;
  strictestSeasonType: string;
  maxOwnerPayoutStrictestCents: number;
  maxOwnerPayoutAverageCents: number;
};

export function computeCapsForStay(params: {
  checkIn: string;
  checkOut?: string | null;
  resortCalculatorCode?: string | null;
}): CapSummary {
  const { checkIn, checkOut, resortCalculatorCode } = params;

  const modifierDollars = getResortModifierDollars(resortCalculatorCode);
  const resortModifierCents = Math.round(modifierDollars * DOLLARS_TO_CENTS);

  const nightDates = getNightDates(checkIn, checkOut);

  const rows: NightCapRow[] = nightDates.map((night) => {
    const band = getReadyStayPricingBand({ check_in: night });
    const baseCapCents = Number(band.guestCapCents ?? 0);
    const finalCapCents = Math.max(0, baseCapCents + resortModifierCents);
    return {
      night,
      seasonType: band.seasonType,
      baseCapCents,
      resortModifierCents,
      finalCapCents,
    };
  });

  let strictestCapCents = Number.POSITIVE_INFINITY;
  let strictestSeasonType = "normal";
  for (const row of rows) {
    if (row.finalCapCents < strictestCapCents) {
      strictestCapCents = row.finalCapCents;
      strictestSeasonType = row.seasonType;
    }
  }
  if (!Number.isFinite(strictestCapCents)) {
    strictestCapCents = rows[0]?.finalCapCents ?? 0;
    strictestSeasonType = rows[0]?.seasonType ?? "normal";
  }

  const averageCapCents = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.finalCapCents, 0) / rows.length)
    : strictestCapCents;

  const maxOwnerPayoutStrictestCents = Math.max(0, strictestCapCents - FEE_PER_POINT_CENTS);
  const maxOwnerPayoutAverageCents = Math.max(0, averageCapCents - FEE_PER_POINT_CENTS);

  return {
    nights: rows,
    strictestCapCents,
    averageCapCents,
    strictestSeasonType,
    maxOwnerPayoutStrictestCents,
    maxOwnerPayoutAverageCents,
  };
}

export function formatDollarsFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

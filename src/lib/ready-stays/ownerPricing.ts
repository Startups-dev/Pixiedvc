import { getReadyStayPricingBand, type ReadyStaySeason } from "@/lib/ready-stays/pricing";

const DOLLARS_TO_CENTS = 100;

export const FEE_PER_POINT = 7;
export const FEE_PER_POINT_CENTS = FEE_PER_POINT * DOLLARS_TO_CENTS;
export const GLOBAL_MIN_OWNER_PAYOUT = 14;

function parseYmdToUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getNightDates(checkIn: string, checkOut?: string | null) {
  const start = parseYmdToUtcDate(checkIn);
  const end = checkOut ? parseYmdToUtcDate(checkOut) : null;

  if (!end || Number.isNaN(end.getTime()) || end <= start) {
    return [formatUtcDate(start)];
  }

  const nights: string[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    nights.push(formatUtcDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return nights.length > 0 ? nights : [formatUtcDate(start)];
}

export function getStayGuestPriceCap({
  checkIn,
  checkOut,
}: {
  checkIn: string;
  checkOut?: string | null;
}): { capDollars: number; seasonType: ReadyStaySeason } {
  const nights = getNightDates(checkIn, checkOut);

  let strictestCapCents = Number.POSITIVE_INFINITY;
  let strictestSeason: ReadyStaySeason = "normal";

  for (const night of nights) {
    const band = getReadyStayPricingBand({ check_in: night });
    if (band.guestCapCents < strictestCapCents) {
      strictestCapCents = band.guestCapCents;
      strictestSeason = band.seasonType;
    }
  }

  if (!Number.isFinite(strictestCapCents)) {
    const fallback = getReadyStayPricingBand({ check_in: checkIn });
    strictestCapCents = fallback.guestCapCents;
    strictestSeason = fallback.seasonType;
  }

  return {
    capDollars: strictestCapCents / DOLLARS_TO_CENTS,
    seasonType: strictestSeason,
  };
}

export function getMaxOwnerPayout({
  checkIn,
  checkOut,
}: {
  checkIn: string;
  checkOut?: string | null;
}) {
  const { capDollars } = getStayGuestPriceCap({ checkIn, checkOut });
  return Math.max(0, capDollars - FEE_PER_POINT);
}

export function getSuggestedOwnerPayouts({
  checkIn,
  checkOut,
}: {
  checkIn: string;
  checkOut?: string | null;
}) {
  const maxOwnerPayout = getMaxOwnerPayout({ checkIn, checkOut });
  const max = Math.floor(maxOwnerPayout);
  const options = [max - 2, max - 1, max].map((value) =>
    Math.max(GLOBAL_MIN_OWNER_PAYOUT, value),
  );

  const unique: number[] = [];
  for (const value of options) {
    if (value > 0 && !unique.includes(value) && value <= max) unique.push(value);
  }

  if (unique.length === 0 && max > 0) return [max];
  return unique;
}

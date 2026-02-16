type ReadyStaySeason =
  | "christmas"
  | "halloween"
  | "marathon"
  | "spring_break"
  | "high"
  | "normal";

type ReadyStayPricingBand = {
  seasonType: ReadyStaySeason;
  minOwnerCents: number;
  suggestedOwnerCents: number;
  maxOwnerCents: number;
  guestCapCents: number;
  pixieFeeCents: number;
};

const BANDS: Record<ReadyStaySeason, ReadyStayPricingBand> = {
  christmas: {
    seasonType: "christmas",
    minOwnerCents: 2800,
    suggestedOwnerCents: 3000,
    maxOwnerCents: 3100,
    guestCapCents: 3800,
    pixieFeeCents: 700,
  },
  halloween: {
    seasonType: "halloween",
    minOwnerCents: 2300,
    suggestedOwnerCents: 2500,
    maxOwnerCents: 2600,
    guestCapCents: 3300,
    pixieFeeCents: 700,
  },
  marathon: {
    seasonType: "marathon",
    minOwnerCents: 2400,
    suggestedOwnerCents: 2600,
    maxOwnerCents: 2800,
    guestCapCents: 3500,
    pixieFeeCents: 700,
  },
  spring_break: {
    seasonType: "spring_break",
    minOwnerCents: 2400,
    suggestedOwnerCents: 2700,
    maxOwnerCents: 2700,
    guestCapCents: 3400,
    pixieFeeCents: 700,
  },
  high: {
    seasonType: "high",
    minOwnerCents: 2200,
    suggestedOwnerCents: 2400,
    maxOwnerCents: 2500,
    guestCapCents: 3200,
    pixieFeeCents: 700,
  },
  normal: {
    seasonType: "normal",
    minOwnerCents: 1900,
    suggestedOwnerCents: 2100,
    maxOwnerCents: 2300,
    guestCapCents: 3000,
    pixieFeeCents: 700,
  },
};

function parseYmdToUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function isWithinWindow(
  month: number,
  day: number,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
) {
  const key = month * 100 + day;
  const startKey = startMonth * 100 + startDay;
  const endKey = endMonth * 100 + endDay;
  if (startKey <= endKey) {
    return key >= startKey && key <= endKey;
  }
  return key >= startKey || key <= endKey;
}

export function getReadyStaySeason(checkIn: string): ReadyStaySeason {
  const date = parseYmdToUtcDate(checkIn);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  if (isWithinWindow(month, day, 12, 15, 1, 5)) return "christmas";
  if (isWithinWindow(month, day, 1, 1, 1, 15)) return "marathon";
  if (isWithinWindow(month, day, 10, 1, 10, 31)) return "halloween";
  if (isWithinWindow(month, day, 3, 1, 4, 20)) return "spring_break";
  if (isWithinWindow(month, day, 5, 15, 8, 31)) return "high";
  return "normal";
}

export function getReadyStayPricingBand({
  check_in,
}: {
  resort_id?: string | null;
  check_in: string;
}): ReadyStayPricingBand {
  const season = getReadyStaySeason(check_in);
  return BANDS[season];
}

export type { ReadyStayPricingBand, ReadyStaySeason };

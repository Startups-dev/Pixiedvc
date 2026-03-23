export type ReadyStaySignalType = "primary" | "secondary" | "meta";

export type ReadyStaySignal = {
  id:
    | "LAST_MINUTE"
    | "FINAL_AVAILABILITY"
    | "HIGH_DEMAND"
    | "BELOW_MARKET"
    | "BEST_PRICE"
    | "SPRING_BREAK"
    | "HOLIDAY_SEASON"
    | "RACE_WEEKEND"
    | "CHECK_IN_SOON"
    | "LIMITED_AVAILABILITY"
    | "VERIFIED_STAY"
    | "INSTANT_BOOKING";
  label: string;
  type: ReadyStaySignalType;
  priority: number;
};

export type ReadyStaySignalInput = {
  checkIn: string;
  seasonType?: string | null;
  similarInventoryCount?: number | null;
  demandScore?: number | null;
  totalPriceCents?: number | null;
  comparableAverageTotalCents?: number | null;
  isLowestPriceComparable?: boolean | null;
};

type SignalDefinition = ReadyStaySignal & {
  condition: (input: ReadyStaySignalInput) => boolean;
};

const HIGH_DEMAND_THRESHOLD = 70;

function daysUntil(dateValue: string) {
  const now = new Date();
  const target = new Date(dateValue);
  const diff = target.getTime() - now.getTime();
  if (Number.isNaN(diff)) return null;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isHolidaySeason(seasonType: string | null | undefined) {
  return seasonType === "christmas" || seasonType === "halloween";
}

const PRIMARY_SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    id: "LAST_MINUTE",
    label: "Last-Minute",
    type: "primary",
    priority: 100,
    condition: (input) => {
      const days = daysUntil(input.checkIn);
      return typeof days === "number" && days <= 30;
    },
  },
  {
    id: "FINAL_AVAILABILITY",
    label: "Final Availability",
    type: "primary",
    priority: 95,
    condition: (input) => Number(input.similarInventoryCount ?? 0) === 1,
  },
  {
    id: "BEST_PRICE",
    label: "Best Price",
    type: "primary",
    priority: 92,
    condition: (input) => Boolean(input.isLowestPriceComparable),
  },
  {
    id: "BELOW_MARKET",
    label: "Below Market",
    type: "primary",
    priority: 90,
    condition: (input) => {
      const comparableAvg = Number(input.comparableAverageTotalCents ?? 0);
      const total = Number(input.totalPriceCents ?? 0);
      if (comparableAvg <= 0 || total <= 0) return false;
      return total < comparableAvg * 0.9;
    },
  },
  {
    id: "HIGH_DEMAND",
    label: "High Demand",
    type: "primary",
    priority: 85,
    condition: (input) => Number(input.demandScore ?? 0) >= HIGH_DEMAND_THRESHOLD,
  },
];

const SECONDARY_SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    id: "SPRING_BREAK",
    label: "Spring Break",
    type: "secondary",
    priority: 40,
    condition: (input) => input.seasonType === "spring_break",
  },
  {
    id: "HOLIDAY_SEASON",
    label: "Holiday Season",
    type: "secondary",
    priority: 35,
    condition: (input) => isHolidaySeason(input.seasonType),
  },
  {
    id: "RACE_WEEKEND",
    label: "Race Weekend",
    type: "secondary",
    priority: 30,
    condition: (input) => input.seasonType === "marathon",
  },
  {
    id: "CHECK_IN_SOON",
    label: "Check-In Soon",
    type: "secondary",
    priority: 20,
    condition: (input) => {
      const days = daysUntil(input.checkIn);
      return typeof days === "number" && days > 30 && days <= 60;
    },
  },
  {
    id: "LIMITED_AVAILABILITY",
    label: "Limited Availability",
    type: "secondary",
    priority: 10,
    condition: (input) => {
      const similarCount = Number(input.similarInventoryCount ?? 0);
      return similarCount > 1 && similarCount <= 3;
    },
  },
];

const META_SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    id: "VERIFIED_STAY",
    label: "Verified DVC stay",
    type: "meta",
    priority: 5,
    condition: () => true,
  },
  {
    id: "INSTANT_BOOKING",
    label: "Instant booking - no request needed",
    type: "meta",
    priority: 5,
    condition: () => true,
  },
];

function conflictsWithPrimary(primary: ReadyStaySignal | null, secondary: ReadyStaySignal) {
  if (!primary) return false;
  if (primary.id === "LAST_MINUTE" && secondary.id === "CHECK_IN_SOON") return true;
  if (primary.id === "FINAL_AVAILABILITY" && secondary.id === "LIMITED_AVAILABILITY") return true;
  return false;
}

function resolveOne(definitions: SignalDefinition[], input: ReadyStaySignalInput) {
  const candidates = definitions.filter((signal) => signal.condition(input));
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0] ?? null;
}

export function resolveReadyStaySignals(input: ReadyStaySignalInput): {
  primary: ReadyStaySignal | null;
  secondary: ReadyStaySignal | null;
  meta: ReadyStaySignal[];
} {
  const primary = resolveOne(PRIMARY_SIGNAL_DEFINITIONS, input);
  const secondaryCandidate = resolveOne(SECONDARY_SIGNAL_DEFINITIONS, input);
  const secondary =
    secondaryCandidate && !conflictsWithPrimary(primary, secondaryCandidate) ? secondaryCandidate : null;
  const meta = META_SIGNAL_DEFINITIONS.filter((signal) => signal.condition(input));

  return {
    primary,
    secondary,
    meta,
  };
}


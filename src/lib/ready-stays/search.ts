export type ReadyStayResortLookup = {
  id: string;
  slug?: string | null;
  calculator_code?: string | null;
};

export type ReadyStayDateMode = "specific" | "flexible";

export type ReadyStaySearchDateFilters = {
  dateMode: ReadyStayDateMode;
  checkIn?: string;
  checkOut?: string;
  month?: string;
};

export function resolveReadyStaySearchDateFilters(input: {
  dateMode?: string;
  checkIn?: string;
  checkOut?: string;
  month?: string;
  // Accepted for legacy URLs but intentionally not used as a filter.
  holiday?: string;
}): ReadyStaySearchDateFilters {
  const checkIn = normalizeReadyStayDate(input.checkIn);
  const checkOut = normalizeReadyStayDate(input.checkOut);
  const dateMode: ReadyStayDateMode =
    input.dateMode === "specific" || input.dateMode === "flexible"
      ? input.dateMode
      : checkIn || checkOut
        ? "specific"
        : "flexible";

  if (dateMode === "specific") {
    return { dateMode, checkIn, checkOut };
  }

  return {
    dateMode,
    month: normalizeReadyStayMonth(input.month),
  };
}

export function resolveReadyStayResortId(
  value: string | undefined,
  resorts: ReadyStayResortLookup[],
): { id: string | null; requested: boolean } {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return { id: null, requested: false };

  const match = resorts.find(
    (resort) =>
      resort.id.toLowerCase() === normalized ||
      resort.slug?.toLowerCase() === normalized ||
      resort.calculator_code?.toLowerCase() === normalized,
  );
  return { id: match?.id ?? null, requested: true };
}

export function matchesReadyStayDates(
  stay: { check_in: string; check_out: string },
  checkIn?: string,
  checkOut?: string,
) {
  if (checkIn && stay.check_in !== checkIn) return false;
  if (checkOut && stay.check_out !== checkOut) return false;
  return true;
}

export function normalizeReadyStayMonth(value?: string) {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return undefined;
  return value;
}

export function readyStayMonthRange(value?: string) {
  const month = normalizeReadyStayMonth(value);
  if (!month) return undefined;

  const [year, monthNumber] = month.split("-").map(Number);
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  return {
    start: `${month}-01`,
    endExclusive: `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

export function matchesReadyStayMonth(stay: { check_in: string; check_out: string }, month?: string) {
  const range = readyStayMonthRange(month);
  if (!range) return true;

  // check_out is exclusive, so a stay ending on the first of the month does not overlap it.
  return stay.check_in < range.endExclusive && stay.check_out > range.start;
}

export function normalizeReadyStayDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : value;
}

import type { PixieReadyStayDateMatch, PixieReadyStayMatchClassification } from "@/lib/pixie/ready-stays/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateOnlyToUtcMs(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const ms = Date.UTC(year, month - 1, day);
  return new Date(ms).toISOString().slice(0, 10) === value ? ms : null;
}

export function diffDateOnlyDays(from: string, to: string) {
  const start = parseDateOnlyToUtcMs(from);
  const end = parseDateOnlyToUtcMs(to);
  if (start === null || end === null) return undefined;
  return Math.round((end - start) / MS_PER_DAY);
}

export function calculateReadyStayNights(arrivalDate?: string | null, departureDate?: string | null) {
  const nights = arrivalDate && departureDate ? diffDateOnlyDays(arrivalDate, departureDate) : undefined;
  return nights && nights > 0 ? nights : undefined;
}

export function evaluateReadyStayDateMatch(params: {
  requestedArrival?: string;
  requestedDeparture?: string;
  flexibleDates?: boolean;
  flexibilityDaysBefore?: number;
  flexibilityDaysAfter?: number;
  listingArrival: string;
  listingDeparture: string;
}): PixieReadyStayDateMatch {
  const listingNights = calculateReadyStayNights(params.listingArrival, params.listingDeparture) ?? 0;
  const requestedNights = calculateReadyStayNights(params.requestedArrival, params.requestedDeparture);
  const warnings: string[] = [];

  if (listingNights <= 0) {
    return {
      classification: "no_match",
      listingNights,
      requestedNights,
      overlapNights: 0,
      withinFlexibility: false,
      sameDuration: false,
      satisfiesFullStay: false,
      satisfiesDates: false,
      requiresDateChange: false,
      requiresLengthChange: false,
      partialStayOnly: false,
      reasonCodes: ["malformed_listing"],
      warnings: ["Ready Stay listing date range is invalid."],
    };
  }

  if (!params.requestedArrival || !params.requestedDeparture || !requestedNights) {
    return {
      classification: "resort_preference_match",
      listingNights,
      requestedNights,
      overlapNights: 0,
      withinFlexibility: false,
      sameDuration: false,
      satisfiesFullStay: false,
      satisfiesDates: false,
      requiresDateChange: true,
      requiresLengthChange: false,
      partialStayOnly: false,
      reasonCodes: ["requires_date_shift"],
      warnings: ["Exact trip dates are not complete, so Ready Stay matching is advisory."],
    };
  }

  const arrivalDifferenceDays = diffDateOnlyDays(params.requestedArrival, params.listingArrival) ?? 0;
  const departureDifferenceDays = diffDateOnlyDays(params.requestedDeparture, params.listingDeparture) ?? 0;
  const sameDuration = listingNights === requestedNights;
  const exact = arrivalDifferenceDays === 0 && departureDifferenceDays === 0;
  const before = params.flexibilityDaysBefore ?? 0;
  const after = params.flexibilityDaysAfter ?? 0;
  const withinFlexibility =
    Boolean(params.flexibleDates) &&
    arrivalDifferenceDays >= -before &&
    arrivalDifferenceDays <= after &&
    departureDifferenceDays >= -before &&
    departureDifferenceDays <= after;

  const requestedStart = parseDateOnlyToUtcMs(params.requestedArrival) ?? 0;
  const requestedEnd = parseDateOnlyToUtcMs(params.requestedDeparture) ?? 0;
  const listingStart = parseDateOnlyToUtcMs(params.listingArrival) ?? 0;
  const listingEnd = parseDateOnlyToUtcMs(params.listingDeparture) ?? 0;
  const overlapNights = Math.max(0, Math.round((Math.min(requestedEnd, listingEnd) - Math.max(requestedStart, listingStart)) / MS_PER_DAY));
  const partialStayOnly = overlapNights > 0 && !exact && (!sameDuration || !withinFlexibility);
  const requiresDateChange = !exact;
  const requiresLengthChange = !sameDuration;
  const satisfiesFullStay = exact || (withinFlexibility && sameDuration);
  const satisfiesDates = exact || withinFlexibility;

  let classification: PixieReadyStayMatchClassification = "near_date_match";
  if (exact) classification = "exact_match";
  else if (withinFlexibility && sameDuration) classification = "flexible_date_match";
  else if (partialStayOnly) classification = "partial_overlap";

  if (!params.flexibleDates && !exact && sameDuration) warnings.push("Dates differ and declared date flexibility is off.");
  if (listingNights < requestedNights) warnings.push("Ready Stay is shorter than the requested trip and cannot satisfy the full stay.");
  if (listingNights > requestedNights) warnings.push("Ready Stays are treated as whole listings; this phase does not shorten longer stays.");

  const reasonCodes: PixieReadyStayDateMatch["reasonCodes"] = [];
  if (exact) reasonCodes.push("exact_dates");
  if (withinFlexibility) reasonCodes.push("within_flexible_dates");
  if (sameDuration) reasonCodes.push("same_trip_length");
  if (requiresDateChange) reasonCodes.push("requires_date_shift");
  if (requiresLengthChange) reasonCodes.push("requires_length_change");
  if (partialStayOnly) reasonCodes.push("partial_overlap_only");
  if (satisfiesFullStay) reasonCodes.push("full_stay_satisfied");

  return {
    classification,
    arrivalDifferenceDays,
    departureDifferenceDays,
    listingNights,
    requestedNights,
    overlapNights,
    withinFlexibility,
    sameDuration,
    satisfiesFullStay,
    satisfiesDates,
    requiresDateChange,
    requiresLengthChange,
    partialStayOnly,
    reasonCodes,
    warnings,
  };
}

import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { normalizePixieTripState } from "@/lib/pixie/planner-state";
import { PIXIE_READY_STAY_PRICING_SOURCE, PIXIE_GUEST_PRICING_VERSION } from "@/lib/pixie/pricing/guest-price-adapter";
import type { PixieTripState } from "@/lib/pixie/schema";
import { evaluateReadyStayBudgetFit } from "@/lib/pixie/ready-stays/budget-fit";
import { evaluateReadyStayCapacity } from "@/lib/pixie/ready-stays/capacity";
import { evaluateReadyStayDateMatch } from "@/lib/pixie/ready-stays/date-matching";
import { explanationFragmentsForReadyStay } from "@/lib/pixie/ready-stays/explanations";
import {
  PIXIE_READY_STAY_MATCHING_VERSION,
  READY_STAY_CLASSIFICATION_PRIORITY,
  isReadyStayResortExcluded,
  scoreReadyStayMatch,
} from "@/lib/pixie/ready-stays/scoring";
import { getPublicReadyStaysForPixie, PIXIE_READY_STAY_VISIBILITY_SOURCE } from "@/lib/pixie/ready-stays/visibility-adapter";
import type {
  PixieReadyStayExcludedListing,
  PixieReadyStayListing,
  PixieReadyStayListingSourceRow,
  PixieReadyStayMatch,
  PixieReadyStayMatchResult,
} from "@/lib/pixie/ready-stays/types";

const DEFAULT_TOP_MATCH_COUNT = 6;

function stableMatchId(state: PixieTripState, listing: PixieReadyStayListing) {
  return [
    "ready_stay",
    listing.listingId,
    state.dates.arrivalDate ?? "any",
    state.dates.departureDate ?? "any",
    state.party.totalPartySize ?? 0,
  ].join(":");
}

function absoluteDateShift(match: PixieReadyStayMatch) {
  return Math.abs(match.dateMatch.arrivalDifferenceDays ?? 999) + Math.abs(match.dateMatch.departureDifferenceDays ?? 999);
}

function sortMatches(a: PixieReadyStayMatch, b: PixieReadyStayMatch) {
  const classDelta = READY_STAY_CLASSIFICATION_PRIORITY[b.classification] - READY_STAY_CLASSIFICATION_PRIORITY[a.classification];
  if (classDelta !== 0) return classDelta;
  if (b.score !== a.score) return b.score - a.score;
  if (Number(b.dateMatch.satisfiesFullStay) !== Number(a.dateMatch.satisfiesFullStay)) {
    return Number(b.dateMatch.satisfiesFullStay) - Number(a.dateMatch.satisfiesFullStay);
  }
  const budgetOrder = { within_budget: 4, near_budget: 3, cannot_evaluate: 2, price_unavailable: 1, over_budget: 0 };
  const budgetDelta = budgetOrder[b.budgetFit.budgetStatus] - budgetOrder[a.budgetFit.budgetStatus];
  if (budgetDelta !== 0) return budgetDelta;
  const shiftDelta = absoluteDateShift(a) - absoluteDateShift(b);
  if (shiftDelta !== 0) return shiftDelta;
  if (a.warnings.length !== b.warnings.length) return a.warnings.length - b.warnings.length;
  const priceA = a.listingPrice?.totalCents ?? Number.POSITIVE_INFINITY;
  const priceB = b.listingPrice?.totalCents ?? Number.POSITIVE_INFINITY;
  if (priceA !== priceB) return priceA - priceB;
  return a.listingId.localeCompare(b.listingId);
}

function buildMatch(state: PixieTripState, listing: PixieReadyStayListing): PixieReadyStayMatch | PixieReadyStayExcludedListing {
  if (isReadyStayResortExcluded(state, listing)) {
    return { listingId: listing.listingId, code: "user_excluded_resort", message: "Ready Stay resort was explicitly excluded by the user." };
  }

  const capacityMatch = evaluateReadyStayCapacity({ party: state.party, sleeps: listing.sleeps });
  if (!capacityMatch.fitsParty) {
    return {
      listingId: listing.listingId,
      code: capacityMatch.capacityStatus === "insufficient" ? "insufficient_capacity" : "malformed_listing",
      message: capacityMatch.warnings[0] ?? "Ready Stay capacity does not fit the party.",
    };
  }

  const dateMatch = evaluateReadyStayDateMatch({
    requestedArrival: state.dates.arrivalDate,
    requestedDeparture: state.dates.departureDate,
    flexibleDates: state.dates.flexibleDates,
    flexibilityDaysBefore: state.dates.flexibilityDaysBefore,
    flexibilityDaysAfter: state.dates.flexibilityDaysAfter,
    listingArrival: listing.arrivalDate,
    listingDeparture: listing.departureDate,
  });
  if (dateMatch.classification === "no_match") {
    return { listingId: listing.listingId, code: "malformed_listing", message: dateMatch.warnings[0] ?? "Ready Stay dates are invalid." };
  }

  const budgetFit = evaluateReadyStayBudgetFit({ state, listingPriceCents: listing.listingPriceCents, listingNights: listing.numberOfNights });
  const scored = scoreReadyStayMatch({ state, listing, dateMatch, capacityMatch, budgetFit });
  const warnings = Array.from(new Set([...listing.warnings, ...dateMatch.warnings, ...capacityMatch.warnings, "Inventory and price must be rechecked before booking."]));
  const dataQuality = !listing.listingPriceCents
    ? "price_unavailable"
    : !listing.roomTypeId
      ? "room_mapping_unknown"
      : warnings.length > 2
        ? "partial"
        : "complete";

  return {
    matchId: stableMatchId(state, listing),
    listingId: listing.listingId,
    classification: dateMatch.classification,
    rank: 0,
    score: scored.score,
    resortId: listing.resortId,
    resortSlug: listing.canonicalResortSlug,
    resortDisplayName: listing.displayResortName,
    subProperty: listing.subProperty,
    roomTypeId: listing.roomTypeId,
    roomDisplayName: listing.roomDisplayName,
    arrivalDate: listing.arrivalDate,
    departureDate: listing.departureDate,
    numberOfNights: listing.numberOfNights,
    sleeps: listing.sleeps,
    points: listing.points,
    listingPrice: listing.listingPriceCents
      ? {
          pricingContext: "ready_stay_listing_price",
          totalCents: listing.listingPriceCents,
          ratePerPointCents: listing.ratePerPointCents,
          currency: "USD",
          estimateStatus: "listing_price",
          source: PIXIE_READY_STAY_PRICING_SOURCE,
          sourceVersion: PIXIE_GUEST_PRICING_VERSION,
        }
      : undefined,
    dateMatch,
    capacityMatch,
    budgetFit,
    reasonCodes: scored.reasonCodes,
    explanationFragments: explanationFragmentsForReadyStay(scored.reasonCodes),
    warnings,
    dataQuality,
    inventoryStatus: "recheck_required_before_booking",
    bookingPath: listing.bookingPath,
    imageReference: listing.imageReference,
    sourceUpdatedAt: listing.sourceUpdatedAt,
    isTestListing: listing.isTestListing,
  };
}

export async function matchPixieReadyStays(params: {
  tripState: PixieTripState;
  listings?: PixieReadyStayListing[];
  rows?: PixieReadyStayListingSourceRow[];
  now?: string;
  nowMs?: number;
  today?: string;
  limit?: number;
}): Promise<PixieReadyStayMatchResult> {
  const state = normalizePixieTripState(params.tripState, { preserveUpdatedAt: true });
  const completeness = evaluatePixieCompleteness(state);
  const warnings = [...completeness.warnings, "Ready Stay matches are advisory; recheck before booking."];
  const excludedListings: PixieReadyStayExcludedListing[] = [];

  if (!completeness.readyForReadyStayMatching) {
    return {
      matches: [],
      groups: { exact: [], flexible: [], alternatives: [] },
      excludedListings: [{ code: "not_ready", message: "Trip needs usable dates and party size before Ready Stay matching." }],
      warnings,
      inputSummary: {
        arrivalDate: state.dates.arrivalDate,
        departureDate: state.dates.departureDate,
        numberOfNights: state.dates.numberOfNights,
        partySize: state.party.totalPartySize ?? 0,
        flexibleDates: state.dates.flexibleDates,
      },
      readiness: { ready: false, warnings },
      generatedAt: params.now ?? new Date().toISOString(),
      matchingVersion: PIXIE_READY_STAY_MATCHING_VERSION,
      pricingSource: PIXIE_READY_STAY_PRICING_SOURCE,
      visibilitySource: PIXIE_READY_STAY_VISIBILITY_SOURCE,
      inventoryDisclaimerKey: "recheck_required_before_booking",
    };
  }

  let listings = params.listings;
  if (!listings) {
    const adapter = await getPublicReadyStaysForPixie({ rows: params.rows, nowMs: params.nowMs, today: params.today });
    listings = adapter.listings;
    warnings.push(...adapter.warnings);
    excludedListings.push(...adapter.excluded.map((item) => ({ listingId: item.listingId, code: item.code, message: item.message })));
  }

  const matches: PixieReadyStayMatch[] = [];
  for (const listing of listings) {
    const result = buildMatch(state, listing);
    if ("matchId" in result) matches.push(result);
    else excludedListings.push(result);
  }

  const sorted = matches.sort(sortMatches).slice(0, params.limit ?? DEFAULT_TOP_MATCH_COUNT).map((match, index) => ({ ...match, rank: index + 1 }));
  const exact = sorted.filter((match) => match.classification === "exact_match");
  const flexible = sorted.filter((match) => match.classification === "flexible_date_match");
  const alternatives = sorted.filter((match) => match.classification !== "exact_match" && match.classification !== "flexible_date_match");

  return {
    matches: sorted,
    groups: { exact, flexible, alternatives },
    excludedListings,
    warnings: Array.from(new Set(warnings)),
    inputSummary: {
      arrivalDate: state.dates.arrivalDate,
      departureDate: state.dates.departureDate,
      numberOfNights: state.dates.numberOfNights,
      partySize: state.party.totalPartySize ?? 0,
      flexibleDates: state.dates.flexibleDates,
    },
    readiness: { ready: true, warnings: Array.from(new Set(warnings)) },
    generatedAt: params.now ?? new Date().toISOString(),
    matchingVersion: PIXIE_READY_STAY_MATCHING_VERSION,
    pricingSource: PIXIE_READY_STAY_PRICING_SOURCE,
    visibilitySource: PIXIE_READY_STAY_VISIBILITY_SOURCE,
    inventoryDisclaimerKey: "recheck_required_before_booking",
  };
}

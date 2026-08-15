import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { normalizePixieTripState } from "@/lib/pixie/planner-state";
import { estimateGuestAccommodationPrice } from "@/lib/pixie/pricing/guest-price-adapter";
import { estimateDvcPoints, PIXIE_SUPPORTED_CALCULATOR_YEARS } from "@/lib/pixie/pricing/points-adapter";
import type { PixieDvcPointsEstimate, PixieGuestPriceEstimate } from "@/lib/pixie/pricing/types";
import { PIXIE_RESORT_CATALOG_VERSION, PIXIE_UNSUPPORTED_WDW_RESORTS, PIXIE_WDW_RESORT_CATALOG } from "@/lib/pixie/resorts/catalog";
import { evaluatePixieResortEligibility } from "@/lib/pixie/resorts/eligibility";
import { explanationForReason } from "@/lib/pixie/resorts/explanations";
import { selectSmallestEligibleRoomType } from "@/lib/pixie/resorts/room-types";
import { PIXIE_SCORING_VERSION, scorePixieResort } from "@/lib/pixie/resorts/scoring";
import type {
  PixieDataQuality,
  PixieExcludedResort,
  PixieReasonCode,
  PixieRecommendationInputSummary,
  PixieResortCatalogItem,
  PixieRoomType,
  PixieScoringBreakdownItem,
} from "@/lib/pixie/resorts/types";
import type { PixieCompletenessResult } from "@/lib/pixie/types";

export const PIXIE_RECOMMENDATION_TOP_LIMIT = 3;

export type PixieResortRecommendation = {
  recommendationId: string;
  resortId: PixieResortCatalogItem["id"];
  resortSlug: string;
  displayName: string;
  rank: number;
  score: number;
  eligibleRoomTypes: PixieRoomType[];
  recommendedRoomType: PixieRoomType;
  estimatedPoints: PixieDvcPointsEstimate | null;
  estimatedGuestPrice: PixieGuestPriceEstimate | null;
  budgetFit: ReturnType<typeof scorePixieResort>["budgetFit"];
  reasonCodes: PixieReasonCode[];
  explanationFragments: string[];
  tradeoffs: string[];
  warnings: string[];
  dataQuality: PixieDataQuality[];
  pricingStatus: "estimated" | "unsupported" | "not_requested";
  calculatorStatus: "estimated" | "unsupported" | "not_requested";
  scoringBreakdown: PixieScoringBreakdownItem[];
};

export type PixieRecommendationResult = {
  recommendations: PixieResortRecommendation[];
  excludedResorts: PixieExcludedResort[];
  warnings: string[];
  inputSummary: PixieRecommendationInputSummary;
  recommendationReadiness: PixieCompletenessResult;
  generatedAt: string;
  scoringVersion: string;
  catalogVersion: string;
  pricingVersion: string;
  calculatorCoverage: {
    supportedYears: readonly number[];
  };
};

function stableRecommendationId(resort: PixieResortCatalogItem, room: PixieRoomType) {
  return `pixie-rec-${resort.id}-${room.id}`;
}

function tradeoffsFor(resort: PixieResortCatalogItem, room: PixieRoomType, reasonCodes: PixieReasonCode[]) {
  const tradeoffs: string[] = [];
  if (!resort.transportationModes.includes("walk") && !resort.transportationModes.includes("monorail") && !resort.transportationModes.includes("skyliner")) {
    tradeoffs.push("Relies more heavily on bus or boat transportation than some alternatives.");
  }
  if (room.maximumCapacity - room.standardCapacity === 0 && room.maximumCapacity <= 4) {
    tradeoffs.push("Room fit is compact for parties near the capacity limit.");
  }
  if (reasonCodes.includes("budget_context_missing")) {
    tradeoffs.push("Budget fit will improve after accommodation budget context is known.");
  }
  return tradeoffs.length ? tradeoffs : ["Final fit still depends on confirmed DVC availability."];
}

function dataQualityFor(params: {
  readiness: PixieCompletenessResult;
  points: PixieDvcPointsEstimate | null;
  price: PixieGuestPriceEstimate | null;
}) {
  const quality = new Set<PixieDataQuality>();
  if (!params.readiness.readyForResortRecommendations) quality.add("incomplete_preferences");
  if (!params.points) quality.add("partial");
  else if (params.points.supported) quality.add("complete");
  else quality.add(params.points.errorReason === "unsupported_year" ? "unsupported_dates" : "unsupported_room_mapping");
  if (!params.price) quality.add("pricing_unavailable");
  else if (params.price.supported) quality.add("estimate_only");
  else quality.add("pricing_unavailable");
  return [...quality];
}

function inputSummary(state: ReturnType<typeof normalizePixieTripState>): PixieRecommendationInputSummary {
  return {
    destination: state.destination,
    arrivalDate: state.dates.arrivalDate,
    departureDate: state.dates.departureDate,
    numberOfNights: state.dates.numberOfNights,
    partySize: state.party.totalPartySize ?? 0,
    budgetType: state.budget.budgetType,
  };
}

function rankTieBreak(a: PixieResortRecommendation, b: PixieResortRecommendation) {
  if (b.score !== a.score) return b.score - a.score;
  if (a.budgetFit !== b.budgetFit) {
    const order = ["within_accommodation_budget", "likely_within_budget", "budget_context_missing", "cannot_evaluate", "possibly_over_budget", "likely_over_budget"];
    return order.indexOf(a.budgetFit) - order.indexOf(b.budgetFit);
  }
  if (a.recommendedRoomType.maximumCapacity !== b.recommendedRoomType.maximumCapacity) {
    return a.recommendedRoomType.maximumCapacity - b.recommendedRoomType.maximumCapacity;
  }
  if (a.warnings.length !== b.warnings.length) return a.warnings.length - b.warnings.length;
  const orderA = PIXIE_WDW_RESORT_CATALOG.find((resort) => resort.id === a.resortId)?.catalogOrder ?? 999;
  const orderB = PIXIE_WDW_RESORT_CATALOG.find((resort) => resort.id === b.resortId)?.catalogOrder ?? 999;
  return orderA - orderB;
}

export function recommendPixieResorts(tripState: unknown, options: { now?: string; topLimit?: number; bookingDate?: string } = {}): PixieRecommendationResult {
  const state = normalizePixieTripState(tripState, { preserveUpdatedAt: true });
  const readiness = evaluatePixieCompleteness(state);
  const warnings: string[] = [];
  if (!readiness.readyForResortRecommendations) warnings.push("Trip is not ready for strong resort recommendations yet.");

  const excludedResorts: PixieExcludedResort[] = PIXIE_UNSUPPORTED_WDW_RESORTS.map((item) => ({
    resortSlug: item.slug,
    displayName: "Fort Wilderness Cabins",
    code: "unsupported_property",
    message: item.reason,
  }));

  const candidates: PixieResortRecommendation[] = [];
  for (const resort of PIXIE_WDW_RESORT_CATALOG) {
    const eligibility = evaluatePixieResortEligibility(resort, state);
    if (!eligibility.eligible) {
      excludedResorts.push(eligibility.exclusion);
      continue;
    }

    const recommendedRoomType = selectSmallestEligibleRoomType(resort, state.party);
    if (!recommendedRoomType) {
      excludedResorts.push({
        resortId: resort.id,
        resortSlug: resort.slug,
        displayName: resort.displayName,
        code: "unsupported_room_mapping",
        message: "No supported room mapping can be recommended.",
      });
      continue;
    }

    const canEstimatePoints = Boolean(state.dates.arrivalDate && state.dates.departureDate);
    const points = canEstimatePoints
      ? estimateDvcPoints({
          resortId: resort.id,
          roomTypeId: recommendedRoomType.id,
          arrivalDate: state.dates.arrivalDate,
          departureDate: state.dates.departureDate,
        })
      : null;
    const price =
      points?.supported === true && points.kind === "exact"
        ? estimateGuestAccommodationPrice({
            pricingContext: "custom_request_estimate",
            resortId: resort.id,
            points: points.totalPoints,
            arrivalDate: state.dates.arrivalDate,
            bookingDate: options.bookingDate,
          })
        : null;
    const scored = scorePixieResort({ resort, recommendedRoomType, state, guestPrice: price });
    const reasonCodes = new Set<PixieReasonCode>(scored.reasonCodes);
    if (points?.supported) reasonCodes.add("exact_dates_priced");
    if (points && !points.supported && points.errorReason === "unsupported_year") reasonCodes.add("calculator_year_unsupported");
    if (!points) reasonCodes.add("dates_not_exact");

    const allWarnings = [...(points?.warnings ?? []), ...(price?.warnings ?? [])];
    const codes = [...reasonCodes];
    candidates.push({
      recommendationId: stableRecommendationId(resort, recommendedRoomType),
      resortId: resort.id,
      resortSlug: resort.slug,
      displayName: resort.displayName,
      rank: 0,
      score: scored.score,
      eligibleRoomTypes: eligibility.eligibleRoomTypes,
      recommendedRoomType,
      estimatedPoints: points,
      estimatedGuestPrice: price,
      budgetFit: scored.budgetFit,
      reasonCodes: codes,
      explanationFragments: codes.map(explanationForReason),
      tradeoffs: tradeoffsFor(resort, recommendedRoomType, codes),
      warnings: allWarnings,
      dataQuality: dataQualityFor({ readiness, points, price }),
      pricingStatus: price ? (price.supported ? "estimated" : "unsupported") : "not_requested",
      calculatorStatus: points ? (points.supported ? "estimated" : "unsupported") : "not_requested",
      scoringBreakdown: scored.breakdown,
    });
  }

  const topLimit = options.topLimit ?? PIXIE_RECOMMENDATION_TOP_LIMIT;
  const recommendations = [...candidates]
    .sort(rankTieBreak)
    .slice(0, topLimit)
    .map((recommendation, index) => ({ ...recommendation, rank: index + 1 }));

  return {
    recommendations,
    excludedResorts,
    warnings,
    inputSummary: inputSummary(state),
    recommendationReadiness: readiness,
    generatedAt: options.now ?? new Date().toISOString(),
    scoringVersion: PIXIE_SCORING_VERSION,
    catalogVersion: PIXIE_RESORT_CATALOG_VERSION,
    pricingVersion: "2026-07-10.phase2.5",
    calculatorCoverage: {
      supportedYears: PIXIE_SUPPORTED_CALCULATOR_YEARS,
    },
  };
}

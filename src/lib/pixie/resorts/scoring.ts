import type { PixieGuestPriceEstimate } from "@/lib/pixie/pricing/types";
import { getPixieResortBySlug } from "@/lib/pixie/resorts/identifiers";
import type {
  PixieBudgetFit,
  PixieReasonCode,
  PixieResortCatalogItem,
  PixieRoomType,
  PixieScoringBreakdownItem,
} from "@/lib/pixie/resorts/types";
import type { PixieTripState } from "@/lib/pixie/schema";

export const PIXIE_SCORING_VERSION = "2026-07-10.phase2";

export const PIXIE_SCORING_WEIGHTS = {
  capacityFit: 18,
  preferredResort: 12,
  parkProximity: 14,
  transportation: 12,
  kitchen: 10,
  pool: 8,
  walking: 8,
  pace: 6,
  budget: 12,
} as const;

function includesAny(values: string[], needles: string[]) {
  const normalized = values.map((value) => value.toLowerCase());
  return needles.some((needle) => normalized.some((value) => value.includes(needle)));
}

function isPreferred(resort: PixieResortCatalogItem, state: PixieTripState) {
  return state.preferences.preferredResorts.some((value) => {
    const resolved = getPixieResortBySlug(value);
    return resolved?.id === resort.id || value.toLowerCase() === resort.slug || value.toLowerCase() === resort.shortName.toLowerCase();
  });
}

function priorityParks(state: PixieTripState) {
  const values = state.preferences.parkPriorities.map((value) => value.toLowerCase());
  const parks: string[] = [];
  if (values.some((value) => value.includes("magic") || value.includes("mk"))) parks.push("magic_kingdom");
  if (values.some((value) => value.includes("epcot"))) parks.push("epcot");
  if (values.some((value) => value.includes("hollywood") || value.includes("studios"))) parks.push("hollywood_studios");
  if (values.some((value) => value.includes("animal"))) parks.push("animal_kingdom");
  return parks;
}

export function evaluateBudgetFit(state: PixieTripState, price: PixieGuestPriceEstimate | null): PixieBudgetFit {
  const budget = state.budget;
  if (budget.amountCents === undefined || budget.budgetType === "unknown") return "budget_context_missing";
  if (!price?.supported || price.estimatedTotalCents === undefined) return "cannot_evaluate";
  if (budget.budgetType === "total_trip") return "cannot_evaluate";

  const comparableBudget =
    budget.budgetType === "nightly"
      ? budget.amountCents * (state.dates.numberOfNights ?? 0)
      : budget.budgetType === "accommodation_only"
        ? budget.amountCents
        : 0;
  if (comparableBudget <= 0) return "cannot_evaluate";
  const ratio = price.estimatedTotalCents / comparableBudget;
  if (ratio <= 1) return "within_accommodation_budget";
  if (ratio <= 1.15) return "possibly_over_budget";
  return "likely_over_budget";
}

function budgetScore(fit: PixieBudgetFit): { points: number; reason: PixieReasonCode } {
  if (fit === "within_accommodation_budget" || fit === "likely_within_budget") return { points: PIXIE_SCORING_WEIGHTS.budget, reason: "within_accommodation_budget" };
  if (fit === "possibly_over_budget") return { points: 4, reason: "possibly_over_budget" };
  if (fit === "likely_over_budget") return { points: 0, reason: "likely_over_budget" };
  if (fit === "cannot_evaluate") return { points: 6, reason: "budget_cannot_evaluate" };
  return { points: 6, reason: "budget_context_missing" };
}

export function scorePixieResort(params: {
  resort: PixieResortCatalogItem;
  recommendedRoomType: PixieRoomType;
  state: PixieTripState;
  guestPrice: PixieGuestPriceEstimate | null;
}): { score: number; reasonCodes: PixieReasonCode[]; breakdown: PixieScoringBreakdownItem[]; budgetFit: PixieBudgetFit } {
  const { resort, recommendedRoomType, state, guestPrice } = params;
  const breakdown: PixieScoringBreakdownItem[] = [];
  const reasonCodes = new Set<PixieReasonCode>(["room_capacity_verified", "smallest_supported_room"]);
  const partySize = state.party.totalPartySize ?? 0;

  const spareCapacity = recommendedRoomType.maximumCapacity - partySize;
  const capacityPoints = Math.max(8, PIXIE_SCORING_WEIGHTS.capacityFit - Math.max(0, spareCapacity) * 2);
  breakdown.push({ dimension: "capacityFit", points: capacityPoints, maxPoints: PIXIE_SCORING_WEIGHTS.capacityFit, reasonCode: "smallest_supported_room" });
  if (partySize >= 5) reasonCodes.add("suitable_for_large_party");

  const preferredPoints = isPreferred(resort, state) ? PIXIE_SCORING_WEIGHTS.preferredResort : 0;
  if (preferredPoints) reasonCodes.add("preferred_resort");
  breakdown.push({ dimension: "preferredResort", points: preferredPoints, maxPoints: PIXIE_SCORING_WEIGHTS.preferredResort, reasonCode: preferredPoints ? "preferred_resort" : undefined });

  const parks = priorityParks(state);
  const parkPoints = parks.length && parks.some((park) => resort.nearbyParks.includes(park as never)) ? PIXIE_SCORING_WEIGHTS.parkProximity : Math.floor(PIXIE_SCORING_WEIGHTS.parkProximity / 2);
  if (parkPoints === PIXIE_SCORING_WEIGHTS.parkProximity) reasonCodes.add("near_priority_park");
  breakdown.push({ dimension: "parkProximity", points: parkPoints, maxPoints: PIXIE_SCORING_WEIGHTS.parkProximity, reasonCode: parkPoints === PIXIE_SCORING_WEIGHTS.parkProximity ? "near_priority_park" : undefined });

  let transportPoints = 6;
  if (includesAny(state.preferences.transportationPreferences, ["monorail"]) && resort.transportationModes.includes("monorail")) {
    transportPoints = PIXIE_SCORING_WEIGHTS.transportation;
    reasonCodes.add("monorail_access");
  } else if (includesAny(state.preferences.transportationPreferences, ["skyliner"]) && resort.transportationModes.includes("skyliner")) {
    transportPoints = PIXIE_SCORING_WEIGHTS.transportation;
    reasonCodes.add("skyliner_access");
  } else if (includesAny(state.preferences.transportationPreferences, ["boat", "water"]) && resort.transportationModes.includes("boat")) {
    transportPoints = PIXIE_SCORING_WEIGHTS.transportation;
    reasonCodes.add("boat_transportation");
  }
  breakdown.push({ dimension: "transportation", points: transportPoints, maxPoints: PIXIE_SCORING_WEIGHTS.transportation });

  const kitchenRequested = state.preferences.kitchenImportance === "high" || includesAny(state.preferences.roomPreferences, ["kitchen", "villa"]);
  const kitchenPoints = !kitchenRequested ? 5 : recommendedRoomType.kitchenLevel === "full" ? PIXIE_SCORING_WEIGHTS.kitchen : 2;
  if (kitchenRequested && recommendedRoomType.kitchenLevel === "full") reasonCodes.add("kitchen_match");
  breakdown.push({ dimension: "kitchen", points: kitchenPoints, maxPoints: PIXIE_SCORING_WEIGHTS.kitchen, reasonCode: kitchenRequested ? "kitchen_match" : undefined });

  const poolPoints = state.preferences.poolImportance === "high" && ["bcv", "pvb", "rva", "akv"].includes(resort.id) ? PIXIE_SCORING_WEIGHTS.pool : 4;
  if (poolPoints === PIXIE_SCORING_WEIGHTS.pool) reasonCodes.add("strong_pool_match");
  breakdown.push({ dimension: "pool", points: poolPoints, maxPoints: PIXIE_SCORING_WEIGHTS.pool, reasonCode: poolPoints === PIXIE_SCORING_WEIGHTS.pool ? "strong_pool_match" : undefined });

  const walkingSensitive = state.preferences.walkingSensitivity === "high" || Boolean(state.accessibility.mobilityConsiderations);
  const walkingPoints = !walkingSensitive ? 4 : resort.transportationModes.includes("monorail") || resort.transportationModes.includes("skyliner") ? PIXIE_SCORING_WEIGHTS.walking : 3;
  if (walkingSensitive && walkingPoints === PIXIE_SCORING_WEIGHTS.walking) reasonCodes.add("lower_walking_burden");
  breakdown.push({ dimension: "walking", points: walkingPoints, maxPoints: PIXIE_SCORING_WEIGHTS.walking, reasonCode: walkingSensitive ? "lower_walking_burden" : undefined });

  const pacePoints = state.preferences.vacationPace === "relaxed" && ["akv", "okw", "ssr", "brv"].includes(resort.id) ? PIXIE_SCORING_WEIGHTS.pace : 3;
  if (pacePoints === PIXIE_SCORING_WEIGHTS.pace) reasonCodes.add("relaxed_pace_match");
  breakdown.push({ dimension: "pace", points: pacePoints, maxPoints: PIXIE_SCORING_WEIGHTS.pace, reasonCode: pacePoints === PIXIE_SCORING_WEIGHTS.pace ? "relaxed_pace_match" : undefined });

  const budgetFit = evaluateBudgetFit(state, guestPrice);
  const budget = budgetScore(budgetFit);
  reasonCodes.add(budget.reason);
  breakdown.push({ dimension: "budget", points: budget.points, maxPoints: PIXIE_SCORING_WEIGHTS.budget, reasonCode: budget.reason });

  if (!state.preferences.resortPriorities.length && !state.preferences.parkPriorities.length && !state.preferences.preferredResorts.length) {
    reasonCodes.add("incomplete_preferences");
  }

  const rawScore = breakdown.reduce((sum, item) => sum + item.points, 0);
  const maxScore = Object.values(PIXIE_SCORING_WEIGHTS).reduce((sum, item) => sum + item, 0);
  return {
    score: Math.round((rawScore / maxScore) * 100),
    reasonCodes: [...reasonCodes],
    breakdown,
    budgetFit,
  };
}

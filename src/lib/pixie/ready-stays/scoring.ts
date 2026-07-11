import { resolvePixieResortId } from "@/lib/pixie/resorts/identifiers";
import { normalizeRoomTypeIdentifier } from "@/lib/pixie/resorts/room-types";
import type { PixieTripState } from "@/lib/pixie/schema";
import type {
  PixieReadyStayBudgetFit,
  PixieReadyStayCapacityMatch,
  PixieReadyStayDateMatch,
  PixieReadyStayListing,
  PixieReadyStayMatchClassification,
  PixieReadyStayReasonCode,
} from "@/lib/pixie/ready-stays/types";

export const PIXIE_READY_STAY_MATCHING_VERSION = "2026-07-11.phase3";

export const PIXIE_READY_STAY_SCORING_WEIGHTS = {
  dateMatch: 35,
  capacityFit: 15,
  preferredResort: 12,
  selectedResort: 8,
  roomPreference: 8,
  budgetFit: 12,
  parkTransportationPreference: 5,
  subPropertyPreference: 3,
  dataQuality: 2,
} as const;

export const READY_STAY_CLASSIFICATION_PRIORITY: Record<PixieReadyStayMatchClassification, number> = {
  exact_match: 5,
  flexible_date_match: 4,
  near_date_match: 3,
  partial_overlap: 2,
  resort_preference_match: 1,
  budget_match: 1,
  no_match: 0,
};

function preferenceMatches(values: string[], candidates: Array<string | undefined>) {
  const normalizedCandidates = candidates.filter(Boolean).map((value) => String(value).toLowerCase());
  return values.some((value) => {
    const normalized = value.toLowerCase();
    return normalizedCandidates.some((candidate) => candidate.includes(normalized) || normalized.includes(candidate));
  });
}

function hasPreferredResort(state: PixieTripState, listing: PixieReadyStayListing) {
  return state.preferences.preferredResorts.some((value) => {
    const resolved = resolvePixieResortId(value);
    return resolved.ok && resolved.resort.id === listing.resortId;
  });
}

export function isReadyStayResortExcluded(state: PixieTripState, listing: PixieReadyStayListing) {
  return state.preferences.excludedResorts.some((value) => {
    const resolved = resolvePixieResortId(value);
    return resolved.ok && resolved.resort.id === listing.resortId;
  });
}

export function scoreReadyStayMatch(params: {
  state: PixieTripState;
  listing: PixieReadyStayListing;
  dateMatch: PixieReadyStayDateMatch;
  capacityMatch: PixieReadyStayCapacityMatch;
  budgetFit: PixieReadyStayBudgetFit;
}): { score: number; reasonCodes: PixieReadyStayReasonCode[] } {
  const { state, listing, dateMatch, capacityMatch, budgetFit } = params;
  const reasonCodes = new Set<PixieReadyStayReasonCode>([
    "public_visible_listing",
    "inventory_may_change",
    "stale_listing_warning",
    ...dateMatch.reasonCodes,
  ]);

  let score = 0;
  if (dateMatch.classification === "exact_match") score += PIXIE_READY_STAY_SCORING_WEIGHTS.dateMatch;
  else if (dateMatch.classification === "flexible_date_match") score += 28;
  else if (dateMatch.classification === "near_date_match") score += 18;
  else if (dateMatch.classification === "partial_overlap") score += 8;

  if (capacityMatch.fitsParty) {
    score += PIXIE_READY_STAY_SCORING_WEIGHTS.capacityFit;
    reasonCodes.add("capacity_verified");
    if ((capacityMatch.spareCapacity ?? 0) > 0) reasonCodes.add("spare_capacity");
  }

  if (hasPreferredResort(state, listing)) {
    score += PIXIE_READY_STAY_SCORING_WEIGHTS.preferredResort;
    reasonCodes.add("preferred_resort");
  }

  const selectedResort = state.selectedOptions.selectedResortId || state.selectedOptions.selectedResortSlug;
  if (selectedResort) {
    const resolved = resolvePixieResortId(selectedResort);
    if (resolved.ok && resolved.resort.id === listing.resortId) {
      score += PIXIE_READY_STAY_SCORING_WEIGHTS.selectedResort;
      reasonCodes.add("selected_resort");
    }
  }

  const roomPreferenceMatched = state.preferences.roomPreferences.some((value) => {
    const roomId = normalizeRoomTypeIdentifier(value);
    return (roomId && roomId === listing.roomTypeId) || preferenceMatches([value], [listing.roomDisplayName]);
  });
  if (roomPreferenceMatched) {
    score += PIXIE_READY_STAY_SCORING_WEIGHTS.roomPreference;
    reasonCodes.add("preferred_room_type");
  }

  if (budgetFit.budgetStatus === "within_budget") score += PIXIE_READY_STAY_SCORING_WEIGHTS.budgetFit;
  else if (budgetFit.budgetStatus === "near_budget") score += Math.round(PIXIE_READY_STAY_SCORING_WEIGHTS.budgetFit * 0.6);
  else if (budgetFit.budgetStatus === "over_budget") score -= 4;
  reasonCodes.add(budgetFit.explanationCode);

  if (listing.listingPriceCents) reasonCodes.add("listing_price_verified");
  else reasonCodes.add("listing_price_unavailable");

  const preferenceText = [...state.preferences.parkPriorities, ...state.preferences.transportationPreferences].join(" ").toLowerCase();
  const resortText = `${listing.canonicalResortSlug} ${listing.displayResortName}`.toLowerCase();
  if (preferenceText && preferenceText.split(/\s+/).some((token) => token.length > 3 && resortText.includes(token))) {
    score += PIXIE_READY_STAY_SCORING_WEIGHTS.parkTransportationPreference;
  }

  const notes = `${state.preferences.generalNotes ?? ""} ${state.preferences.resortPriorities.join(" ")}`.toLowerCase();
  if (listing.subProperty !== "unknown" && notes.includes(listing.subProperty)) {
    score += PIXIE_READY_STAY_SCORING_WEIGHTS.subPropertyPreference;
    reasonCodes.add("preferred_sub_property");
  }
  if (listing.subProperty === "unknown" && listing.resortId === "akv") reasonCodes.add("unknown_sub_property");
  if (!listing.roomTypeId) reasonCodes.add("unknown_room_mapping");
  if (listing.warnings.includes("visible_test_listing")) reasonCodes.add("visible_test_listing");

  if (listing.roomTypeId && listing.listingPriceCents) score += PIXIE_READY_STAY_SCORING_WEIGHTS.dataQuality;
  score = Math.max(0, Math.min(100, score));
  return { score, reasonCodes: Array.from(reasonCodes) };
}

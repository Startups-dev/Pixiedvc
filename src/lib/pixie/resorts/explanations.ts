import type { PixieReasonCode } from "@/lib/pixie/resorts/types";

export const PIXIE_REASON_EXPLANATIONS: Record<PixieReasonCode, string> = {
  preferred_resort: "Matches a resort the planner state marked as preferred.",
  near_priority_park: "Fits a park area the trip has prioritized.",
  monorail_access: "Has monorail access for Magic Kingdom-area travel.",
  skyliner_access: "Has Skyliner access for EPCOT or Hollywood Studios-area travel.",
  boat_transportation: "Has boat transportation that matches the trip preferences.",
  strong_pool_match: "Pool priority is supported by verified resort metadata.",
  kitchen_match: "Recommended room type includes the requested kitchen level.",
  lower_walking_burden: "Transportation and location reduce walking burden relative to other options.",
  relaxed_pace_match: "Fits a slower or resort-focused pace.",
  suitable_for_large_party: "Has verified room capacity for a larger party.",
  smallest_supported_room: "Uses the smallest verified room type that fits the party.",
  within_accommodation_budget: "Estimated accommodation cost fits the accommodation budget.",
  possibly_over_budget: "Estimated accommodation cost may exceed the compatible budget.",
  likely_over_budget: "Estimated accommodation cost is likely above the compatible budget.",
  budget_context_missing: "Budget context is missing or not accommodation-specific.",
  budget_cannot_evaluate: "Budget cannot be evaluated from the current state.",
  exact_dates_priced: "Points and pricing were estimated from exact stay dates.",
  dates_not_exact: "Exact pricing needs exact arrival and departure dates.",
  calculator_year_unsupported: "Point charts are not available for one or more stay years.",
  room_capacity_verified: "Room capacity comes from calculator resort metadata.",
  room_capacity_unverified: "Room capacity could not be verified.",
  user_excluded: "The user explicitly excluded this resort.",
  unsupported_property: "This property is outside Pixie v1 WDW support or missing trusted metadata.",
  unsupported_room_mapping: "No trusted calculator room mapping exists for this resort and party.",
  incomplete_preferences: "More trip preferences would improve ranking confidence.",
};

export function explanationForReason(code: PixieReasonCode) {
  return PIXIE_REASON_EXPLANATIONS[code];
}

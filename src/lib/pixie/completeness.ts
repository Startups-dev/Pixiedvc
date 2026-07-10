import type { PixieTripState } from "@/lib/pixie/schema";
import type { PixieCompletenessResult, PixiePlanningStage, PixieQuestionKey } from "@/lib/pixie/types";
import { normalizePixieTripState } from "@/lib/pixie/planner-state";

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function hasBasicPriorities(state: PixieTripState) {
  return Boolean(
    state.preferences.resortPriorities.length ||
      state.preferences.parkPriorities.length ||
      state.preferences.attractionInterests.length ||
      state.preferences.preferredResorts.length ||
      state.preferences.favoriteCharactersOrThemes.length ||
      state.preferences.generalNotes,
  );
}

function evaluateStage(input: {
  datesComplete: boolean;
  hasUsableDates: boolean;
  partyComplete: boolean;
  hasPreferences: boolean;
  readyForResortRecommendations: boolean;
  readyForItinerary: boolean;
  readyForBookingDraft: boolean;
}): PixiePlanningStage {
  if (input.readyForBookingDraft) return "booking_ready";
  if (input.readyForItinerary && input.readyForResortRecommendations) return "plan_ready";
  if (input.readyForResortRecommendations) return "recommendation_ready";
  if (input.hasPreferences) return "preferences_defined";
  if (input.partyComplete) return "party_defined";
  if (input.hasUsableDates) return "dates_defined";
  return "new";
}

export function evaluatePixieCompleteness(state: PixieTripState): PixieCompletenessResult {
  const normalized = normalizePixieTripState(state, { preserveUpdatedAt: true });
  const datesComplete = Boolean(normalized.dates.arrivalDate && normalized.dates.departureDate && normalized.dates.numberOfNights);
  const hasUsableDates = datesComplete || Boolean(normalized.dates.flexibleDates && (normalized.dates.arrivalDate || normalized.dates.dateNotes));
  const partyComplete = Boolean((normalized.party.totalPartySize ?? 0) > 0);
  const budgetUnderstood = normalized.budget.budgetType !== "unknown" || normalized.budget.amountCents !== undefined;
  const hasPreferences = hasBasicPriorities(normalized);
  const hasCandidateResort = Boolean(normalized.selectedOptions.selectedResortId || normalized.selectedOptions.selectedResortSlug);
  const hasRoomType = Boolean(normalized.selectedOptions.selectedRoomType || normalized.preferences.roomPreferences.length);
  const hasParkDayIntent = normalized.preferences.parkDayIntention === true || normalized.preferences.parkPriorities.length > 0;
  const hasPace = normalized.preferences.vacationPace !== "unknown";

  const readyForResortRecommendations = normalized.destination === "walt_disney_world" && hasUsableDates && partyComplete && hasPreferences;
  const readyForPointEstimates = datesComplete && partyComplete && hasCandidateResort && hasRoomType;
  const readyForReadyStayMatching = hasUsableDates && partyComplete;
  const readyForItinerary = Boolean((datesComplete || normalized.dates.numberOfNights || normalized.dates.flexibleDates) && hasParkDayIntent && hasPace);
  const readyForBookingDraft = datesComplete && partyComplete && hasCandidateResort && hasRoomType;

  const missingRequired: PixieQuestionKey[] = [];
  if (!hasUsableDates) missingRequired.push("ask_dates");
  if (!partyComplete) missingRequired.push("ask_party");
  if (!hasPreferences) missingRequired.push("ask_trip_priorities");

  const missingRecommended: PixieQuestionKey[] = [];
  if (!budgetUnderstood) missingRecommended.push("ask_budget_context");
  if (!hasPace) missingRecommended.push("ask_pace");
  if (!hasParkDayIntent) missingRecommended.push("ask_park_days");
  if (!hasCandidateResort) missingRecommended.push("ask_resort_choice");
  if (!hasRoomType) missingRecommended.push("ask_room_type");

  const warnings: string[] = [];
  if (normalized.dates.flexibleDates && !datesComplete) {
    warnings.push("Dates are flexible; exact estimates and booking drafts will need final dates.");
  }
  if (readyForResortRecommendations && !budgetUnderstood) {
    warnings.push("Budget context is missing, so value recommendations may be less precise.");
  }
  if (readyForBookingDraft) {
    warnings.push("Booking draft readiness still requires authentication and booking-form guest details later.");
  }

  let score = 10;
  if (hasUsableDates) score += 20;
  if (datesComplete) score += 10;
  if (partyComplete) score += 20;
  if (hasPreferences) score += 20;
  if (budgetUnderstood) score += 10;
  if (readyForItinerary) score += 10;
  if (readyForBookingDraft) score += 10;
  score = Math.min(100, score);

  const planningStage = evaluateStage({
    datesComplete,
    hasUsableDates,
    partyComplete,
    hasPreferences,
    readyForResortRecommendations,
    readyForItinerary,
    readyForBookingDraft,
  });

  return {
    score,
    planningStage,
    missingRequired: unique(missingRequired),
    missingRecommended: unique(missingRecommended),
    warnings,
    readyForResortRecommendations,
    readyForPointEstimates,
    readyForReadyStayMatching,
    readyForItinerary,
    readyForBookingDraft,
    suggestedNextQuestionKey: missingRequired[0] ?? missingRecommended[0],
  };
}

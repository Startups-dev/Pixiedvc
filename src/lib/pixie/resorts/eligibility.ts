import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { getPixieResortBySlug } from "@/lib/pixie/resorts/identifiers";
import { getEligibleRoomTypes } from "@/lib/pixie/resorts/room-types";
import type { PixieExcludedResort, PixieResortCatalogItem } from "@/lib/pixie/resorts/types";
import type { PixieTripState } from "@/lib/pixie/schema";

function normalizePreference(value: string) {
  return value.trim().toLowerCase();
}

export function isResortExplicitlyExcluded(resort: PixieResortCatalogItem, state: PixieTripState) {
  const excluded = state.preferences.excludedResorts.map(normalizePreference);
  return excluded.some((value) => {
    if (!value) return false;
    const resolved = getPixieResortBySlug(value);
    return resolved?.id === resort.id || resort.slug === value || resort.aliases.includes(value) || resort.shortName.toLowerCase() === value;
  });
}

export function evaluatePixieResortEligibility(
  resort: PixieResortCatalogItem,
  state: PixieTripState,
): { eligible: true; eligibleRoomTypes: ReturnType<typeof getEligibleRoomTypes> } | { eligible: false; exclusion: PixieExcludedResort } {
  if (!resort.supported || !resort.active) {
    return {
      eligible: false,
      exclusion: {
        resortId: resort.id,
        resortSlug: resort.slug,
        displayName: resort.displayName,
        code: "unsupported_property",
        message: "Resort is not supported by Pixie v1.",
      },
    };
  }

  if (isResortExplicitlyExcluded(resort, state)) {
    return {
      eligible: false,
      exclusion: {
        resortId: resort.id,
        resortSlug: resort.slug,
        displayName: resort.displayName,
        code: "user_excluded",
        message: "User explicitly excluded this resort.",
      },
    };
  }

  const eligibleRoomTypes = getEligibleRoomTypes(resort, state.party);
  if (eligibleRoomTypes.length === 0) {
    return {
      eligible: false,
      exclusion: {
        resortId: resort.id,
        resortSlug: resort.slug,
        displayName: resort.displayName,
        code: "insufficient_room_capacity",
        message: "No verified supported room type can accommodate the party.",
      },
    };
  }

  return { eligible: true, eligibleRoomTypes };
}

export function recommendationReadinessWarning(state: PixieTripState) {
  const completeness = evaluatePixieCompleteness(state);
  return completeness.readyForResortRecommendations ? null : "Trip is not ready for resort recommendations yet.";
}

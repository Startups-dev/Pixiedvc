import type { PixieTripState } from "@/lib/pixie/schema";

export type PixieResortId =
  | "akv"
  | "blt"
  | "bcv"
  | "bwv"
  | "brv"
  | "ccv"
  | "okw"
  | "pvb"
  | "rva"
  | "ssr"
  | "vgf";

export type PixieLocationCategory = "magic_kingdom" | "epcot" | "animal_kingdom" | "disney_springs";
export type PixieTransportationMode = "walk" | "monorail" | "skyliner" | "boat" | "bus";
export type PixiePark = "magic_kingdom" | "epcot" | "hollywood_studios" | "animal_kingdom";
export type PixieResortCategory = "value_access" | "select_access" | "priority_access" | "premier_access";

export type PixieRoomTypeId =
  | "studio"
  | "duo_studio"
  | "tower_studio"
  | "deluxe_studio"
  | "resort_studio"
  | "one_bedroom"
  | "two_bedroom"
  | "three_bedroom_grand_villa"
  | "bungalow"
  | "cabin"
  | "treehouse"
  | "penthouse";

export type PixieKitchenLevel = "none" | "kitchenette" | "full";
export type PixieLaundryAvailability = "none" | "shared" | "in_room";

export type PixieRoomType = {
  id: PixieRoomTypeId;
  calculatorRoomCode: string;
  displayName: string;
  standardCapacity: number;
  maximumCapacity: number;
  bedroomCount: number;
  kitchenLevel: PixieKitchenLevel;
  laundryAvailability: PixieLaundryAvailability;
  calculatorSupported: boolean;
  notes?: string;
};

export type PixieResortCatalogItem = {
  id: PixieResortId;
  slug: string;
  aliases: string[];
  calculatorCode: string;
  bookingValue: string;
  displayName: string;
  shortName: string;
  locationCategory: PixieLocationCategory;
  transportationModes: PixieTransportationMode[];
  nearbyParks: PixiePark[];
  resortCategory: PixieResortCategory;
  roomTypes: PixieRoomType[];
  image: {
    resortSlug: string;
    resortCode: string;
  };
  active: boolean;
  supported: boolean;
  catalogOrder: number;
};

export type PixieIdentifierErrorCode =
  | "unknown_identifier"
  | "ambiguous_identifier"
  | "non_wdw_resort"
  | "unsupported_resort";

export type PixieIdentifierResult =
  | { ok: true; resort: PixieResortCatalogItem }
  | { ok: false; code: PixieIdentifierErrorCode; input: string; message: string };

export type PixieEligibilityExclusionCode =
  | "unsupported_property"
  | "user_excluded"
  | "unsupported_room_mapping"
  | "insufficient_room_capacity"
  | "calculator_year_unsupported";

export type PixieExcludedResort = {
  resortId?: PixieResortId;
  resortSlug?: string;
  displayName?: string;
  code: PixieEligibilityExclusionCode;
  message: string;
};

export type PixieReasonCode =
  | "preferred_resort"
  | "near_priority_park"
  | "monorail_access"
  | "skyliner_access"
  | "boat_transportation"
  | "strong_pool_match"
  | "kitchen_match"
  | "lower_walking_burden"
  | "relaxed_pace_match"
  | "suitable_for_large_party"
  | "smallest_supported_room"
  | "within_accommodation_budget"
  | "possibly_over_budget"
  | "likely_over_budget"
  | "budget_context_missing"
  | "budget_cannot_evaluate"
  | "exact_dates_priced"
  | "dates_not_exact"
  | "calculator_year_unsupported"
  | "room_capacity_verified"
  | "room_capacity_unverified"
  | "user_excluded"
  | "unsupported_property"
  | "unsupported_room_mapping"
  | "incomplete_preferences";

export type PixieBudgetFit =
  | "within_accommodation_budget"
  | "likely_within_budget"
  | "possibly_over_budget"
  | "likely_over_budget"
  | "budget_context_missing"
  | "cannot_evaluate";

export type PixieDataQuality =
  | "complete"
  | "partial"
  | "estimate_only"
  | "unsupported_dates"
  | "unsupported_room_mapping"
  | "pricing_unavailable"
  | "incomplete_preferences";

export type PixieScoringBreakdownItem = {
  dimension: string;
  points: number;
  maxPoints: number;
  reasonCode?: PixieReasonCode;
  explanation?: string;
};

export type PixieRecommendationInputSummary = {
  destination: PixieTripState["destination"];
  arrivalDate?: string;
  departureDate?: string;
  numberOfNights?: number;
  partySize: number;
  budgetType: PixieTripState["budget"]["budgetType"];
};

export const PIXIE_SCHEMA_VERSION = 1;
export const PIXIE_LOCAL_DRAFT_VERSION = 1;
export const PIXIE_LOCAL_DRAFT_STORAGE_KEY = "pixiedvc:pixie:draft:v1";

export const PIXIE_LIMITS = {
  maxTripDurationNights: 30,
  maxFlexibleDateWindowDays: 30,
  maxPartySize: 12,
  maxTravellers: 12,
  maxNoteLength: 1000,
  maxShortTextLength: 160,
  maxArrayItems: 20,
  maxPreferencesPerGroup: 12,
  maxTravellerInterests: 8,
  maxLocalDraftBytes: 64 * 1024,
  maxRecentDraftMessages: 6,
  maxRecentDraftMessageLength: 500,
} as const;

export const PIXIE_DESTINATIONS = ["walt_disney_world"] as const;

export const PIXIE_PLANNING_STAGES = [
  "new",
  "discovering",
  "dates_defined",
  "party_defined",
  "preferences_defined",
  "recommendation_ready",
  "plan_ready",
  "booking_ready",
] as const;

export const PIXIE_BUDGET_TYPES = ["total_trip", "accommodation_only", "nightly", "unknown"] as const;
export const PIXIE_SUPPORTED_CURRENCIES = ["USD", "CAD"] as const;

export const PIXIE_TRAVELLER_CATEGORIES = ["adult", "child", "infant", "unknown"] as const;
export const PIXIE_AGE_GROUPS = ["infant", "preschooler", "child", "teen", "adult", "unknown"] as const;

export const PIXIE_VACATION_PACES = ["relaxed", "balanced", "packed", "unknown"] as const;
export const PIXIE_PRIORITY_LEVELS = ["low", "medium", "high", "unknown"] as const;
export const PIXIE_EXPERIENCE_LEVELS = ["first_visit", "occasional", "experienced", "unknown"] as const;

export const PIXIE_QUESTION_KEYS = [
  "ask_dates",
  "ask_party",
  "ask_budget_context",
  "ask_trip_priorities",
  "ask_pace",
  "ask_park_days",
  "ask_resort_choice",
  "ask_room_type",
] as const;

export const WDW_DVC_RESORT_SLUGS = [
  "animal-kingdom-villas",
  "animal-kingdom-kidani",
  "bay-lake-tower",
  "beach-club-villas",
  "boardwalk-villas",
  "boulder-ridge-villas",
  "copper-creek-villas",
  "fort-wilderness-cabins",
  "grand-floridian-villas",
  "old-key-west",
  "polynesian-villas",
  "riviera-resort",
  "saratoga-springs",
] as const;

export const PIXIE_PATCHABLE_SECTIONS = [
  "destination",
  "tripName",
  "dates",
  "party",
  "budget",
  "preferences",
  "accessibility",
  "dvcContext",
  "planningWorkspace",
  "selectedOptions",
  "metadata",
] as const;

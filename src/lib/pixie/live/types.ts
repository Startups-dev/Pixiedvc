import type { HannaKnowledgeContext, HannaResolvedEntity } from "@/lib/pixie/knowledge";
import type { PixieRecentMessage } from "@/lib/pixie/ai/schemas";
import type { PixieTripState } from "@/lib/pixie/schema";

export const DISNEY_WORLD_TIME_ZONE = "America/New_York" as const;

export type LiveDisneyIntentKind =
  | "park_hours"
  | "entertainment_times"
  | "attraction_status"
  | "refurbishment_status"
  | "current_menu"
  | "current_price"
  | "current_meal_period"
  | "current_wait_time"
  | "dining_reservation_availability";

export type LiveDisneyResultStatus = "supported_live_result" | "live_source_unavailable" | "live_source_error" | "no_result";

export type LiveDisneySourceType = "third_party_public_api" | "official_public" | "fake" | "unsupported";

export type LiveDisneyConfidence = "high" | "medium" | "low";

export type LiveDisneyProvenance = {
  sourceType: LiveDisneySourceType;
  sourceName: string;
  sourceRef?: string;
  sourceUrl?: string;
  retrievedAt: string;
  effectiveDate?: string;
  status: LiveDisneyResultStatus;
  confidence: LiveDisneyConfidence;
};

export type LiveDisneyEntity = {
  id: string;
  name: string;
  entityType: HannaResolvedEntity["entityType"];
  providerEntityId?: string;
};

export type LiveDisneyIntent = {
  kind: LiveDisneyIntentKind;
  entity?: LiveDisneyEntity;
  date?: string;
  timeContext?: "date_specific" | "right_now";
  diningAvailabilityQuery?: DiningAvailabilityQuery;
  phrase: string;
};

export type ParkOperatingHours = {
  kind: "park_hours";
  park: LiveDisneyEntity;
  date: string;
  openTime?: string;
  closeTime?: string;
  timeZone: typeof DISNEY_WORLD_TIME_ZONE;
  status: LiveDisneyResultStatus;
  notes?: string[];
  provenance: LiveDisneyProvenance;
};

export type EntertainmentSchedule = {
  kind: "entertainment_times";
  experience: LiveDisneyEntity;
  park?: LiveDisneyEntity;
  date: string;
  times: string[];
  timeZone: typeof DISNEY_WORLD_TIME_ZONE;
  status: LiveDisneyResultStatus;
  notes?: string[];
  provenance: LiveDisneyProvenance;
};

export type AttractionOperatingStatus = {
  kind: "attraction_status" | "refurbishment_status" | "current_wait_time";
  attraction: LiveDisneyEntity;
  date?: string;
  operatingStatus?: "operating" | "temporarily_down" | "closed_for_refurbishment" | "closed" | "unknown";
  waitMinutes?: number;
  timeZone: typeof DISNEY_WORLD_TIME_ZONE;
  status: LiveDisneyResultStatus;
  notes?: string[];
  provenance: LiveDisneyProvenance;
};

export type CurrentDiningInfo = {
  kind: "current_menu" | "current_price" | "current_meal_period";
  diningLocation: LiveDisneyEntity;
  date?: string;
  mealPeriods?: string[];
  menuItems?: Array<{ name: string; price?: string; category?: string }>;
  priceSummary?: string;
  currentMenuUrl?: string;
  status: LiveDisneyResultStatus;
  notes?: string[];
  provenance: LiveDisneyProvenance;
};

export type DiningAvailabilityQuery = {
  date?: string;
  partySize?: number;
  targetTime?: string;
  windowStart?: string;
  windowEnd?: string;
  toleranceMinutes?: number;
  mealPeriod?: "breakfast" | "brunch" | "lunch" | "dinner";
  locationScope?: string;
  restaurants: LiveDisneyEntity[];
  missingRequiredFields: Array<"date" | "partySize" | "restaurant">;
};

export type DiningAvailabilitySlot = {
  time: string;
  bookingUrl?: string;
  sourceRef?: string;
};

export type DiningAvailabilityState =
  | "available"
  | "no_match_in_requested_window"
  | "no_availability_found"
  | "source_unavailable"
  | "source_error"
  | "unsupported"
  | "unknown";

export type DiningReservationAvailability = {
  kind: "dining_reservation_availability";
  diningLocation: LiveDisneyEntity;
  date?: string;
  partySize?: number;
  targetTime?: string;
  windowStart?: string;
  windowEnd?: string;
  availabilityState: DiningAvailabilityState;
  availableTimes: DiningAvailabilitySlot[];
  status: LiveDisneyResultStatus;
  bookingUrl?: string;
  notes?: string[];
  provenance: LiveDisneyProvenance;
};

export type LiveDisneyUnavailable = {
  kind: LiveDisneyIntentKind;
  entity?: LiveDisneyEntity;
  date?: string;
  status: "live_source_unavailable" | "no_result";
  reason: string;
  provenance: LiveDisneyProvenance;
};

export type LiveDisneyError = {
  kind: LiveDisneyIntentKind;
  entity?: LiveDisneyEntity;
  date?: string;
  status: "live_source_error";
  reason: string;
  provenance: LiveDisneyProvenance;
};

export type LiveDisneyContext = {
  source: "live_disney_v1";
  retrievedAt: string;
  timeZone: typeof DISNEY_WORLD_TIME_ZONE;
  intents: LiveDisneyIntent[];
  parkHours: ParkOperatingHours[];
  entertainment: EntertainmentSchedule[];
  attractionStatus: AttractionOperatingStatus[];
  diningCurrent: CurrentDiningInfo[];
  diningAvailability: DiningReservationAvailability[];
  unavailable: LiveDisneyUnavailable[];
  errors: LiveDisneyError[];
};

export type LiveDisneyRetrievalInput = {
  latestUserMessage: string;
  currentState: PixieTripState;
  recentMessages?: PixieRecentMessage[];
  knowledgeContext?: HannaKnowledgeContext;
  now?: string;
  maxResults?: number;
};

export type LiveDisneyProviderQuery = {
  intent: LiveDisneyIntent;
  now: string;
};

export interface LiveDisneyProvider {
  name: string;
  sourceType: LiveDisneySourceType;
  getParkHours?(query: LiveDisneyProviderQuery): Promise<ParkOperatingHours | LiveDisneyUnavailable>;
  getEntertainmentSchedule?(query: LiveDisneyProviderQuery): Promise<EntertainmentSchedule | LiveDisneyUnavailable>;
  getAttractionStatus?(query: LiveDisneyProviderQuery): Promise<AttractionOperatingStatus | LiveDisneyUnavailable>;
  getCurrentDiningInfo?(query: LiveDisneyProviderQuery): Promise<CurrentDiningInfo | LiveDisneyUnavailable>;
  getDiningAvailability?(query: LiveDisneyProviderQuery): Promise<DiningReservationAvailability[] | LiveDisneyUnavailable>;
}

export interface LiveDisneyService {
  retrieve(input: LiveDisneyRetrievalInput): Promise<LiveDisneyContext>;
}

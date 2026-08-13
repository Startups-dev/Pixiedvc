import type { PixieTripState } from "@/lib/pixie/schema";

export type HannaKnowledgeFreshnessClass = "stable" | "refreshable" | "live_required" | "hanna_editorial";
export type HannaKnowledgeStatus = "verified" | "needs_review" | "deprecated" | "live_required";
export type HannaKnowledgeSourceType = "curated_hanna" | "official_reference" | "manual_update" | "provider_api" | "live_tool";

export type HannaKnowledgeProvenance = {
  sourceType: HannaKnowledgeSourceType;
  sourceRef?: string;
  sourceUrl?: string;
  verifiedAt?: string;
  freshnessClass: HannaKnowledgeFreshnessClass;
  status: HannaKnowledgeStatus;
};

export type HannaKnowledgeDomain =
  | "park"
  | "area"
  | "resort"
  | "dining"
  | "transportation"
  | "family"
  | "geography"
  | "attraction"
  | "entertainment"
  | "height"
  | "weather"
  | "rest"
  | "pacing"
  | "discovery";
export type HannaEntityType = "park" | "area" | "resort" | "dining_location" | "transportation_connection" | "planning_signal" | "attraction" | "entertainment";
export type HannaGeographicRelationship = "exact_location" | "directly_connected" | "nearby" | "general_relevance";

export type HannaBaseRecord = {
  id: string;
  name: string;
  aliases?: string[];
  tags?: string[];
  provenance: HannaKnowledgeProvenance;
  status?: HannaKnowledgeStatus;
};

export type HannaPark = HannaBaseRecord & {
  entityType: "park";
  shortName?: string;
};

export type HannaParkArea = HannaBaseRecord & {
  entityType: "area";
  parkId?: string;
  parentAreaId?: string;
};

export type HannaResort = HannaBaseRecord & {
  entityType: "resort";
  resortType: "dvc" | "disney_resort" | "other";
  parkAccess?: string[];
  areaId?: string;
  transportationModes: HannaTransportationMode[];
};

export type HannaTransportationMode = "walk" | "boat" | "monorail" | "skyliner" | "bus";

export type HannaDiningServiceType = "table_service" | "quick_service" | "lounge" | "snack" | "snack_specialty" | "character_dining" | "buffet_family_style" | "signature";
export type HannaDiningCostTier = "value" | "moderate" | "expensive" | "premium";
export type HannaMealPeriod = "breakfast" | "brunch" | "lunch" | "dinner" | "snack";
export type HannaDiningPricingType = "quick_service" | "a_la_carte" | "prix_fixe" | "buffet" | "family_style" | "character_dining" | "snack" | "mixed";
export type HannaDiningPricingConfidence = "high" | "medium" | "low";

export type HannaDiningPricing = {
  pricingType: HannaDiningPricingType;
  priceTier: HannaDiningCostTier;
  planningEstimate?: {
    adultLow: number;
    adultHigh: number;
    childLow?: number;
    childHigh?: number;
    currency: "USD";
    basis: "adult_entree" | "adult_meal" | "fixed_meal" | "quick_service_meal" | "snack";
  };
  fixedPrice?: {
    adult: number;
    child?: number;
    childAgeMin?: number;
    childAgeMax?: number;
    mealPeriod?: HannaMealPeriod;
    currency: "USD";
    effectiveDate?: string;
  };
  includesTax: false;
  includesGratuity: false;
  lastReviewedAt: string;
  confidence: HannaDiningPricingConfidence;
  provenance: HannaKnowledgeProvenance;
  notes?: string[];
};
export type HannaHeightRequirement =
  | { kind: "none" }
  | { kind: "minimum"; inches: number; provenance: HannaKnowledgeProvenance }
  | { kind: "unknown" };

export type HannaDiningLocation = HannaBaseRecord & {
  entityType: "dining_location";
  locationId: string;
  serviceType: HannaDiningServiceType;
  cuisine: string;
  mealPeriods: HannaMealPeriod[];
  costTier?: HannaDiningCostTier;
  costTierProvenance?: HannaKnowledgeProvenance;
  pricing?: HannaDiningPricing;
  characterDining?: "yes" | "no" | "refreshable_unknown";
  toddlerFit: "strong" | "good" | "mixed" | "weak";
  reservationPlanning: "usually_recommended" | "helpful" | "usually_not_needed";
};

export type HannaTransportationConnection = HannaBaseRecord & {
  entityType: "transportation_connection";
  fromId: string;
  toId: string;
  modes: HannaTransportationMode[];
  strollerNotes?: string;
  complexity: "easy" | "moderate" | "high";
};

export type HannaAttraction = HannaBaseRecord & {
  entityType: "attraction";
  parkId: string;
  areaId: string;
  attractionType: "ride" | "walkthrough" | "play_area" | "animal_experience" | "interactive";
  experienceTags: string[];
  heightRequirement: HannaHeightRequirement;
  typicalAudience: "toddler" | "family" | "older_kids_adults" | "thrill";
  indoorOutdoor: "indoor" | "outdoor" | "mixed";
  physicalIntensity: "low" | "moderate" | "high";
  darkRide?: boolean;
  waterExposure?: "none" | "minor" | "likely";
  toddlerSuitability: "strong" | "good" | "mixed" | "weak";
  planningTags: string[];
};

export type HannaEntertainmentExperience = HannaBaseRecord & {
  entityType: "entertainment";
  parkId: string;
  areaId: string;
  entertainmentType: "show" | "nighttime_spectacular" | "parade" | "character_experience";
  experienceTags: string[];
  indoorOutdoor: "indoor" | "outdoor" | "mixed";
  toddlerSuitability: "strong" | "good" | "mixed" | "weak";
  planningTags: string[];
};

export type HannaPlanningSignal = HannaBaseRecord & {
  entityType: "planning_signal";
  appliesToIds: string[];
  contexts: string[];
  priority: "low" | "medium" | "high";
  shortReason: string;
};

export type HannaKnowledgeRecord =
  | HannaPark
  | HannaParkArea
  | HannaResort
  | HannaDiningLocation
  | HannaTransportationConnection
  | HannaAttraction
  | HannaEntertainmentExperience
  | HannaPlanningSignal;

export type HannaResolvedEntity = {
  id: string;
  name: string;
  entityType: HannaEntityType;
  matchedAlias: string;
};

export type HannaKnowledgeIntent = {
  domains: HannaKnowledgeDomain[];
  mealPeriod?: HannaMealPeriod;
  toddlerContext: boolean;
  comparisonMode: boolean;
  liveRequests: HannaKnowledgeLiveGap["kind"][];
};

export type HannaKnowledgeLiveGap = {
  kind:
    | "dining_reservation_availability"
    | "current_menu_prices"
    | "current_menu"
    | "park_hours"
    | "showtimes"
    | "temporary_closures"
    | "current_attraction_status"
    | "event_schedule"
    | "current_wait_time"
    | "lightning_lane_availability";
  entityId?: string;
  reason: string;
};

export type HannaKnowledgeGap = {
  kind: "knowledge_gap";
  requested: string;
  reason: string;
};

export type HannaKnowledgeRetrievalInput = {
  latestUserMessage: string;
  currentState: PixieTripState;
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  maxCandidates?: number;
  maxSignals?: number;
};

export type HannaKnowledgeCandidate = {
  id: string;
  name: string;
  entityType: HannaEntityType;
  locationName?: string;
  serviceType?: HannaDiningServiceType;
  cuisine?: string;
  mealPeriods?: HannaMealPeriod[];
  costTier?: HannaDiningCostTier;
  costFreshness?: HannaKnowledgeFreshnessClass;
  pricing?: HannaDiningPricing;
  toddlerFit?: HannaDiningLocation["toddlerFit"];
  reservationPlanning?: HannaDiningLocation["reservationPlanning"];
  attractionType?: HannaAttraction["attractionType"];
  entertainmentType?: HannaEntertainmentExperience["entertainmentType"];
  heightRequirement?: HannaHeightRequirement;
  typicalAudience?: HannaAttraction["typicalAudience"];
  indoorOutdoor?: HannaAttraction["indoorOutdoor"];
  physicalIntensity?: HannaAttraction["physicalIntensity"];
  toddlerSuitability?: HannaAttraction["toddlerSuitability"];
  geographicRelationship?: HannaGeographicRelationship;
  matchReasons?: string[];
  comparisonGroup?: string;
  transportationModes?: HannaTransportationMode[];
  tags?: string[];
};

export type HannaKnowledgeContext = {
  source: "hanna_v1_static";
  domains: HannaKnowledgeDomain[];
  resolvedEntities: HannaResolvedEntity[];
  candidates: HannaKnowledgeCandidate[];
  planningSignals: Array<{
    id: string;
    shortReason: string;
    contexts: string[];
    appliesTo: string[];
    priority: HannaPlanningSignal["priority"];
  }>;
  liveGaps: HannaKnowledgeLiveGap[];
  knowledgeGaps: HannaKnowledgeGap[];
};

export interface HannaKnowledgeRepository {
  listRecords(): HannaKnowledgeRecord[];
  findById(id: string): HannaKnowledgeRecord | undefined;
}

export interface HannaKnowledgeService {
  retrieve(input: HannaKnowledgeRetrievalInput): HannaKnowledgeContext;
}

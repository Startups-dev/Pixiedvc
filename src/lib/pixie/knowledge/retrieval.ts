import { buildHannaKnowledgeContext } from "@/lib/pixie/knowledge/context-builder";
import { resolveHannaEntities } from "@/lib/pixie/knowledge/entity-resolver";
import { detectHannaKnowledgeIntent } from "@/lib/pixie/knowledge/intent";
import { createStaticHannaKnowledgeRepository } from "@/lib/pixie/knowledge/repository";
import type {
  HannaAttraction,
  HannaDiningCostTier,
  HannaDiningLocation,
  HannaDiningServiceType,
  HannaEntertainmentExperience,
  HannaGeographicRelationship,
  HannaKnowledgeCandidate,
  HannaKnowledgeContext,
  HannaKnowledgeGap,
  HannaKnowledgeLiveGap,
  HannaKnowledgeRecord,
  HannaKnowledgeRepository,
  HannaKnowledgeRetrievalInput,
  HannaKnowledgeService,
  HannaMealPeriod,
  HannaParkArea,
  HannaPlanningSignal,
  HannaResolvedEntity,
  HannaResort,
  HannaTransportationConnection,
} from "@/lib/pixie/knowledge/types";

const DEFAULT_MAX_CANDIDATES = 8;
const HARD_MAX_CANDIDATES = 8;
const DEFAULT_MAX_SIGNALS = 3;
const HARD_MAX_SIGNALS = 3;

type ScoredCandidate = HannaKnowledgeCandidate & {
  score: number;
};

type QueryConstraints = {
  insideOnly: boolean;
  nearbyAllowed: boolean;
  notAtResort: boolean;
  noBuses: boolean;
  noCharacterDining: boolean;
  budgetConscious: boolean;
  pickyEaterContext: boolean;
  specialDining: boolean;
  specialOccasion: boolean;
  indoorPreferred: boolean;
  restPreferred: boolean;
  rainContext: boolean;
  heatContext: boolean;
  discoveryContext: boolean;
  priorityRequest: boolean;
  skipRequest: boolean;
  requestedServiceTypes: HannaDiningServiceType[];
  cuisinePreferences: string[];
  followUpToPriorCandidates: boolean;
  lateNightContext: boolean;
  heightInches?: number;
};

function isArea(record: HannaKnowledgeRecord): record is HannaParkArea {
  return record.entityType === "area";
}

function isResort(record: HannaKnowledgeRecord): record is HannaResort {
  return record.entityType === "resort";
}

function isDining(record: HannaKnowledgeRecord): record is HannaDiningLocation {
  return record.entityType === "dining_location";
}

function isAttraction(record: HannaKnowledgeRecord): record is HannaAttraction {
  return record.entityType === "attraction";
}

function isEntertainment(record: HannaKnowledgeRecord): record is HannaEntertainmentExperience {
  return record.entityType === "entertainment";
}

function isTransport(record: HannaKnowledgeRecord): record is HannaTransportationConnection {
  return record.entityType === "transportation_connection";
}

function isSignal(record: HannaKnowledgeRecord): record is HannaPlanningSignal {
  return record.entityType === "planning_signal";
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function includesAny(message: string, terms: string[]) {
  return terms.some((term) => message.includes(term));
}

function analyzeConstraints(message: string): QueryConstraints {
  const normalized = normalizeText(message);
  const requestedServiceTypes: HannaDiningServiceType[] = [];
  const noCharacterDining = includesAny(normalized, ["not character dining", "no character dining", "without characters"]);
  const specialDining = includesAny(normalized, ["nice dinner", "nice epcot dinner", "special dinner", "special occasion", "date night", "signature", "anniversary", "birthday", "romantic"]) || (normalized.includes("nice") && normalized.includes("dinner"));
  if (includesAny(normalized, ["quick service", "counter service", "quick meal", "casual quick", "quick lunch"])) requestedServiceTypes.push("quick_service");
  if (includesAny(normalized, ["table service", "sit down", "sit down meal"])) requestedServiceTypes.push("table_service", "character_dining", "buffet_family_style", "signature");
  if (!noCharacterDining && includesAny(normalized, ["character breakfast", "character dining", "with characters"])) requestedServiceTypes.push("character_dining");
  if (includesAny(normalized, ["snack", "snacks"])) requestedServiceTypes.push("snack", "snack_specialty");
  if (specialDining) requestedServiceTypes.push("table_service", "signature");

  const cuisinePreferences = [
    "african",
    "american",
    "asian",
    "barbecue",
    "bbq",
    "bakery",
    "burger",
    "burgers",
    "french",
    "german",
    "italian",
    "mediterranean",
    "mexican",
    "pizza",
    "pub",
    "seafood",
    "steak",
    "sushi",
  ].filter((term) => normalized.includes(term));

  return {
    insideOnly: includesAny(normalized, ["inside ", " in the park", "in epcot", "in magic kingdom", "inside epcot", "inside magic kingdom", "only"]),
    nearbyAllowed: includesAny(normalized, ["nearby", "near ", "or nearby", "around", "close to"]),
    notAtResort: includesAny(normalized, ["not at a resort", "no resort", "inside the park only", "park only"]),
    noBuses: includesAny(normalized, ["no buses", "avoid buses", "without buses"]),
    noCharacterDining,
    budgetConscious: includesAny(normalized, ["inexpensive", "cheap", "budget", "low cost", "nothing expensive", "not expensive", "forget the expensive", "skip expensive"]),
    pickyEaterContext: includesAny(normalized, ["picky eater", "selective eater", "simple foods", "familiar food", "familiar foods"]),
    specialDining,
    specialOccasion: includesAny(normalized, ["special occasion", "anniversary", "birthday", "romantic", "celebration"]),
    indoorPreferred: includesAny(normalized, ["rain", "raining", "hot", "heat", "cool down", "cool off", "indoor", "inside", "air conditioned", "air-conditioned"]),
    restPreferred: includesAny(normalized, ["take a break", "rest area", "nap", "tired", "exhausted", "missed her nap", "missed his nap", "cool down", "cool off"]),
    rainContext: includesAny(normalized, ["rain", "raining", "storm", "storming"]),
    heatContext: includesAny(normalized, ["hot", "heat", "cool down", "cool off"]),
    discoveryContext: includesAny(normalized, ["surprise me", "surprise", "havent thought of", "probably havent thought of", "neat", "overlooked", "hidden", "worth noticing"]),
    priorityRequest: includesAny(normalized, ["first thing", "prioritize", "best five", "best 5", "only have", "three hours", "3 hours", "90 minutes", "what should we do"]),
    skipRequest: includesAny(normalized, ["skip", "avoid", "not worth"]),
    requestedServiceTypes,
    cuisinePreferences,
    followUpToPriorCandidates: includesAny(normalized, ["which two", "which one", "would you keep", "keep", "forget the expensive", "those", "ones"]),
    lateNightContext: includesAny(normalized, ["late", "late night", "party", "halloween party", "christmas party", "after fireworks"]),
    heightInches: Number(normalized.match(/\b(\d{2})\s*(?:inch|inches|in|tall)\b/)?.[1]) || undefined,
  };
}

function locationChainIds(locationId: string, repository: HannaKnowledgeRepository): string[] {
  const ids = new Set<string>([locationId]);
  let current = repository.findById(locationId);
  while (current && isArea(current)) {
    if (current.parkId) ids.add(current.parkId);
    if (!current.parentAreaId) break;
    ids.add(current.parentAreaId);
    current = repository.findById(current.parentAreaId);
  }
  if (current && isResort(current)) {
    if (current.areaId) ids.add(current.areaId);
    for (const parkId of current.parkAccess ?? []) ids.add(parkId);
  }
  return [...ids];
}

function physicalLocationChainIds(locationId: string, repository: HannaKnowledgeRepository): string[] {
  const ids = new Set<string>([locationId]);
  let current = repository.findById(locationId);
  while (current && isArea(current)) {
    if (current.parkId) ids.add(current.parkId);
    if (!current.parentAreaId) break;
    ids.add(current.parentAreaId);
    current = repository.findById(current.parentAreaId);
  }
  return [...ids];
}

function locationName(locationId: string, repository: HannaKnowledgeRepository) {
  return repository.findById(locationId)?.name;
}

function stateContextIds(input: HannaKnowledgeRetrievalInput, repository: HannaKnowledgeRepository) {
  const resolvedFromState = new Set<string>();
  const stateText = [
    input.currentState.dvcContext.homeResort,
    ...(input.currentState.preferences.preferredResorts ?? []),
    ...(input.currentState.preferences.parkPriorities ?? []),
    ...(input.currentState.preferences.resortPriorities ?? []),
    ...(input.currentState.preferences.diningPreferences ?? []),
    ...(input.currentState.preferences.transportationPreferences ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  for (const entity of resolveHannaEntities(stateText, repository)) {
    resolvedFromState.add(entity.id);
  }

  return resolvedFromState;
}

function recentUserContext(input: HannaKnowledgeRetrievalInput) {
  return (input.recentMessages ?? [])
    .filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => message.content)
    .join(" ");
}

function lodgingContextIds(message: string, entities: HannaResolvedEntity[]) {
  const normalized = normalizeText(message);
  return new Set(
    entities
      .filter((entity) => entity.entityType === "resort")
      .filter((entity) => {
        const alias = normalizeText(entity.matchedAlias);
        return normalized.includes(`staying at ${alias}`) || normalized.includes(`staying in ${alias}`) || normalized.includes(`stay at ${alias}`);
      })
      .map((entity) => entity.id),
  );
}

function relatedIdsFor(resolvedIds: Set<string>, repository: HannaKnowledgeRepository) {
  const related = new Set(resolvedIds);
  for (const id of resolvedIds) {
    const record = repository.findById(id);
    if (!record) continue;
    if (isArea(record)) {
      if (record.parkId) related.add(record.parkId);
      if (record.parentAreaId) related.add(record.parentAreaId);
    }
    if (isResort(record)) {
      if (record.areaId) related.add(record.areaId);
      for (const parkId of record.parkAccess ?? []) related.add(parkId);
    }
    if (isDining(record)) {
      for (const locationId of locationChainIds(record.locationId, repository)) related.add(locationId);
    }
    if (isAttraction(record) || isEntertainment(record)) {
      related.add(record.parkId);
      related.add(record.areaId);
    }
  }
  return related;
}

function hasYoungChild(input: HannaKnowledgeRetrievalInput) {
  const party = input.currentState.party;
  if ((party.travellers ?? []).some((traveller) => traveller.age !== undefined && traveller.age <= 5)) return true;
  return false;
}

function hasAnyChild(input: HannaKnowledgeRetrievalInput) {
  return (input.currentState.party.children ?? 0) > 0 || (input.currentState.party.travellers ?? []).some((traveller) => traveller.ageGroup === "child");
}

function relationshipRank(relationship: HannaGeographicRelationship) {
  if (relationship === "exact_location") return 4;
  if (relationship === "directly_connected") return 3;
  if (relationship === "nearby") return 2;
  return 1;
}

function relationshipScore(relationship: HannaGeographicRelationship) {
  if (relationship === "exact_location") return 70;
  if (relationship === "directly_connected") return 38;
  if (relationship === "nearby") return 22;
  return 8;
}

function isResortLocation(locationId: string, repository: HannaKnowledgeRepository) {
  const location = repository.findById(locationId);
  return location?.entityType === "resort" || Boolean(location?.tags?.includes("resort_area"));
}

function isCharacterDining(dining: HannaDiningLocation) {
  return dining.serviceType === "character_dining" || dining.characterDining === "yes" || Boolean(dining.tags?.includes("character_dining") || dining.tags?.includes("character_breakfast"));
}

function diningServiceTypeMatches(dining: HannaDiningLocation, requested: HannaDiningServiceType[]) {
  if (requested.length === 0) return true;
  if (requested.includes(dining.serviceType)) return true;
  if (requested.includes("character_dining") && isCharacterDining(dining)) return true;
  if (requested.includes("table_service") && ["buffet_family_style", "signature", "character_dining"].includes(dining.serviceType)) return true;
  if (requested.includes("snack") && dining.serviceType === "snack_specialty") return true;
  return false;
}

function connectedRelationship(targetId: string, dining: HannaDiningLocation, repository: HannaKnowledgeRepository): HannaGeographicRelationship | undefined {
  const target = repository.findById(targetId);
  const location = repository.findById(dining.locationId);
  if (!target || !location) return undefined;

  if (isResort(location) && target.entityType === "park" && location.parkAccess?.includes(target.id)) return "directly_connected";
  if (isResort(target) && location.entityType === "park" && target.parkAccess?.includes(location.id)) return "directly_connected";
  if (isResort(target) && isArea(location) && target.areaId === location.id) return "nearby";
  if (target.entityType === "park" && location.tags?.includes("resort_area") && location.tags?.some((tag) => target.tags?.includes(tag))) return "directly_connected";
  if (isResort(target) && location.tags?.some((tag) => target.tags?.includes(tag))) return "nearby";
  return undefined;
}

function geographicRelationship(params: {
  dining: HannaDiningLocation;
  explicitTargetIds: Set<string>;
  stateRelatedIds: Set<string>;
  repository: HannaKnowledgeRepository;
}): HannaGeographicRelationship | undefined {
  const { dining, explicitTargetIds, stateRelatedIds, repository } = params;
  const locationIds = physicalLocationChainIds(dining.locationId, repository);
  if (explicitTargetIds.has(dining.id)) return "exact_location";

  let best: HannaGeographicRelationship | undefined;
  for (const targetId of explicitTargetIds) {
    let relationship: HannaGeographicRelationship | undefined;
    if (locationIds.includes(targetId)) relationship = "exact_location";
    else relationship = connectedRelationship(targetId, dining, repository);
    if (!relationship) continue;
    if (!best || relationshipRank(relationship) > relationshipRank(best)) best = relationship;
  }
  if (best) return best;

  if (locationIds.some((id) => stateRelatedIds.has(id)) || stateRelatedIds.has(dining.id)) return "general_relevance";
  if (explicitTargetIds.size === 0 && stateRelatedIds.size === 0) return "general_relevance";
  return undefined;
}

function diningMatchesConstraints(dining: HannaDiningLocation, constraints: QueryConstraints, relationship: HannaGeographicRelationship | undefined, repository: HannaKnowledgeRepository, mealPeriod?: HannaMealPeriod) {
  if (!relationship) return false;
  if (constraints.insideOnly && relationship !== "exact_location") return false;
  if (constraints.notAtResort && isResortLocation(dining.locationId, repository)) return false;
  if (constraints.noCharacterDining && isCharacterDining(dining)) return false;
  if (constraints.budgetConscious && (dining.costTier === "expensive" || dining.costTier === "premium")) return false;
  if (!diningServiceTypeMatches(dining, constraints.requestedServiceTypes)) return false;
  if (mealPeriod && !dining.mealPeriods.includes(mealPeriod)) return false;
  if (constraints.specialDining && dining.serviceType === "quick_service") return false;
  return true;
}

function diningScore(params: {
  dining: HannaDiningLocation;
  relationship: HannaGeographicRelationship;
  mealPeriod?: HannaMealPeriod;
  toddlerContext: boolean;
  constraints: QueryConstraints;
}) {
  const { dining, relationship, mealPeriod, toddlerContext, constraints } = params;
  let score = relationshipScore(relationship);
  const reasons: string[] = [`geo:${relationship}`];

  if (mealPeriod && dining.mealPeriods.includes(mealPeriod)) {
    score += 12;
    reasons.push(`meal:${mealPeriod}`);
  }
  if (toddlerContext) {
    if (dining.toddlerFit === "strong") {
      score += 14;
      reasons.push("family:toddler_strong");
    } else if (dining.toddlerFit === "good") {
      score += 8;
      reasons.push("family:toddler_good");
    }
  }
  if (constraints.budgetConscious && (dining.costTier === "value" || dining.costTier === "moderate")) {
    score += dining.costTier === "value" ? 14 : 5;
    reasons.push(`budget:${dining.costTier}`);
  }
  if (diningServiceTypeMatches(dining, constraints.requestedServiceTypes)) {
    score += 12;
    reasons.push(`type:${dining.serviceType}`);
  }
  if (constraints.specialDining && dining.serviceType !== "quick_service") {
    score += dining.serviceType === "signature" || dining.tags?.includes("signature") ? 18 : 8;
    reasons.push("style:special_dinner");
  }
  if (constraints.specialOccasion && dining.tags?.some((tag) => ["special_occasion", "romantic", "scenic", "signature"].includes(tag))) {
    score += 16;
    reasons.push("occasion:special");
  }
  for (const preference of constraints.cuisinePreferences) {
    if (normalizeText(dining.cuisine).includes(preference) || dining.tags?.some((tag) => normalizeText(tag).includes(preference))) {
      score += 16;
      reasons.push(`cuisine:${preference}`);
      break;
    }
  }
  if (constraints.pickyEaterContext && dining.tags?.some((tag) => ["simple_foods", "familiar_foods", "pizza", "burger", "burgers", "buffet", "family_style"].includes(tag))) {
    score += 14;
    reasons.push("preference:simple_foods");
  }
  if (constraints.nearbyAllowed && (relationship === "directly_connected" || relationship === "nearby")) {
    score += 18;
    reasons.push("nearby:explicitly_allowed");
  }
  if (constraints.nearbyAllowed && dining.tags?.some((tag) => ["boardwalk", "epcot_resort_area", "magic_kingdom_resort_area", "monorail"].includes(tag))) {
    score += 8;
    reasons.push("nearby:resort_area");
  }
  if (isCharacterDining(dining) && toddlerContext && !constraints.noCharacterDining) {
    score += 4;
    reasons.push("type:character_toddler");
  }
  if (dining.reservationPlanning === "usually_not_needed" && constraints.budgetConscious) score += 3;

  return { score, reasons };
}

function retrieveDiningCandidates(params: {
  repository: HannaKnowledgeRepository;
  explicitTargetIds: Set<string>;
  stateRelatedIds: Set<string>;
  constraints: QueryConstraints;
  toddlerContext: boolean;
  mealPeriod?: HannaMealPeriod;
  maxCandidates: number;
}): ScoredCandidate[] {
  const candidates = params.repository
    .listRecords()
    .filter(isDining)
    .map((dining) => {
      const relationship = geographicRelationship({
        dining,
        explicitTargetIds: params.explicitTargetIds,
        stateRelatedIds: params.stateRelatedIds,
        repository: params.repository,
      });
      if (!diningMatchesConstraints(dining, params.constraints, relationship, params.repository, params.mealPeriod)) return null;
      const scored = diningScore({
        dining,
        relationship,
        mealPeriod: params.mealPeriod,
        toddlerContext: params.toddlerContext,
        constraints: params.constraints,
      });
      return {
        id: dining.id,
        name: dining.name,
        entityType: dining.entityType,
        locationName: locationName(dining.locationId, params.repository),
        serviceType: dining.serviceType,
        cuisine: dining.cuisine,
        mealPeriods: dining.mealPeriods,
        costTier: dining.costTier,
        costFreshness: dining.costTierProvenance?.freshnessClass,
        toddlerFit: dining.toddlerFit,
        reservationPlanning: dining.reservationPlanning,
        geographicRelationship: relationship,
        matchReasons: scored.reasons,
        tags: dining.tags,
        score: scored.score,
      };
    })
    .filter((candidate): candidate is ScoredCandidate => Boolean(candidate))
    .sort((a, b) => b.score - a.score || relationshipRank(b.geographicRelationship ?? "general_relevance") - relationshipRank(a.geographicRelationship ?? "general_relevance") || a.name.localeCompare(b.name));

  if (params.constraints.nearbyAllowed) {
    const exact = candidates.filter((candidate) => candidate.geographicRelationship === "exact_location");
    const connected = candidates.filter((candidate) => candidate.geographicRelationship === "directly_connected" || candidate.geographicRelationship === "nearby");
    if (exact.length > 0 && connected.length > 0) {
      const selected = [...exact.slice(0, Math.max(1, params.maxCandidates - 2)), ...connected.slice(0, 2)];
      return selected
        .filter((candidate, index, list) => list.findIndex((item) => item.id === candidate.id) === index)
        .slice(0, params.maxCandidates);
    }
  }

  return candidates.slice(0, params.maxCandidates);
}

function physicalExperienceIds(record: HannaAttraction | HannaEntertainmentExperience) {
  return [record.id, record.areaId, record.parkId];
}

function experienceRelationship(record: HannaAttraction | HannaEntertainmentExperience, explicitTargetIds: Set<string>, stateRelatedIds: Set<string>): HannaGeographicRelationship | undefined {
  const ids = physicalExperienceIds(record);
  if (explicitTargetIds.has(record.id)) return "exact_location";
  if ([...explicitTargetIds].some((id) => ids.includes(id))) return "exact_location";
  if (explicitTargetIds.size === 0 && ids.some((id) => stateRelatedIds.has(id))) return "general_relevance";
  if (explicitTargetIds.size === 0 && stateRelatedIds.size === 0) return "general_relevance";
  return undefined;
}

function eligibleForHeight(record: HannaAttraction, heightInches?: number) {
  if (heightInches === undefined) return true;
  if (record.heightRequirement.kind === "none") return true;
  if (record.heightRequirement.kind === "minimum") return heightInches >= record.heightRequirement.inches;
  return false;
}

function attractionScore(params: {
  attraction: HannaAttraction;
  relationship: HannaGeographicRelationship;
  constraints: QueryConstraints;
  toddlerContext: boolean;
  familyContext: boolean;
}) {
  const { attraction, relationship, constraints, toddlerContext, familyContext } = params;
  let score = relationshipScore(relationship);
  const reasons = [`geo:${relationship}`];

  if (toddlerContext) {
    if (attraction.toddlerSuitability === "strong") {
      score += 20;
      reasons.push("family:toddler_strong");
    } else if (attraction.toddlerSuitability === "good") {
      score += 12;
      reasons.push("family:toddler_good");
    } else if (attraction.toddlerSuitability === "weak") {
      score -= 35;
      reasons.push("family:toddler_weak");
    }
  } else if (familyContext && attraction.typicalAudience === "family") {
    score += 8;
    reasons.push("family:family_fit");
  }

  if (constraints.heightInches !== undefined) {
    score += attraction.heightRequirement.kind === "none" ? 16 : 18;
    reasons.push(`height:eligible_${constraints.heightInches}`);
  }
  if (constraints.indoorPreferred && attraction.indoorOutdoor === "indoor") {
    score += 18;
    reasons.push(constraints.heatContext ? "weather:cool_down" : "weather:indoor");
  }
  if (constraints.rainContext && attraction.indoorOutdoor === "outdoor") score -= 14;
  if (constraints.restPreferred && attraction.planningTags.some((tag) => ["rest", "low_energy", "long_seated", "baby_care"].includes(tag))) {
    score += 18;
    reasons.push("pace:rest");
  }
  if (constraints.priorityRequest && attraction.planningTags.includes("priority")) {
    score += 12;
    reasons.push("priority:park_day");
  }
  if (constraints.discoveryContext && attraction.planningTags.includes("discovery")) {
    score += 18;
    reasons.push("discovery:nearby");
  }
  if (constraints.skipRequest && attraction.toddlerSuitability === "weak") {
    score += 12;
    reasons.push("skip:poor_fit");
  }
  if (attraction.status === "needs_review") {
    score -= 8;
    reasons.push("status:needs_review");
  }

  return { score, reasons };
}

function retrieveAttractionCandidates(params: {
  repository: HannaKnowledgeRepository;
  explicitTargetIds: Set<string>;
  stateRelatedIds: Set<string>;
  constraints: QueryConstraints;
  toddlerContext: boolean;
  familyContext: boolean;
  maxCandidates: number;
}): ScoredCandidate[] {
  return params.repository
    .listRecords()
    .filter(isAttraction)
    .filter((attraction) => eligibleForHeight(attraction, params.constraints.heightInches))
    .map((attraction) => {
      const relationship = experienceRelationship(attraction, params.explicitTargetIds, params.stateRelatedIds);
      if (!relationship) return null;
      const scored = attractionScore({
        attraction,
        relationship,
        constraints: params.constraints,
        toddlerContext: params.toddlerContext,
        familyContext: params.familyContext,
      });
      if (scored.score <= 0) return null;
      return {
        id: attraction.id,
        name: attraction.name,
        entityType: attraction.entityType,
        locationName: locationName(attraction.areaId, params.repository),
        attractionType: attraction.attractionType,
        heightRequirement: attraction.heightRequirement,
        typicalAudience: attraction.typicalAudience,
        indoorOutdoor: attraction.indoorOutdoor,
        physicalIntensity: attraction.physicalIntensity,
        toddlerSuitability: attraction.toddlerSuitability,
        geographicRelationship: relationship,
        matchReasons: scored.reasons,
        tags: attraction.planningTags,
        score: scored.score,
      };
    })
    .filter((candidate): candidate is ScoredCandidate => Boolean(candidate))
    .sort((a, b) => b.score - a.score || relationshipRank(b.geographicRelationship ?? "general_relevance") - relationshipRank(a.geographicRelationship ?? "general_relevance") || a.name.localeCompare(b.name))
    .slice(0, params.maxCandidates);
}

function retrieveEntertainmentCandidates(params: {
  repository: HannaKnowledgeRepository;
  explicitTargetIds: Set<string>;
  stateRelatedIds: Set<string>;
  constraints: QueryConstraints;
  toddlerContext: boolean;
  maxCandidates: number;
}): ScoredCandidate[] {
  return params.repository
    .listRecords()
    .filter(isEntertainment)
    .map((entertainment) => {
      const relationship = experienceRelationship(entertainment, params.explicitTargetIds, params.stateRelatedIds);
      if (!relationship) return null;
      let score = relationshipScore(relationship) + 10;
      const reasons = [`geo:${relationship}`, "type:entertainment"];
      if (params.toddlerContext && entertainment.toddlerSuitability === "strong") {
        score += 16;
        reasons.push("family:toddler_strong");
      } else if (params.toddlerContext && entertainment.toddlerSuitability === "good") {
        score += 10;
        reasons.push("family:toddler_good");
      }
      if (params.constraints.indoorPreferred && entertainment.indoorOutdoor === "indoor") {
        score += 14;
        reasons.push("weather:indoor");
      }
      if (params.constraints.restPreferred && entertainment.planningTags.includes("rest")) {
        score += 12;
        reasons.push("pace:rest");
      }
      return {
        id: entertainment.id,
        name: entertainment.name,
        entityType: entertainment.entityType,
        locationName: locationName(entertainment.areaId, params.repository),
        entertainmentType: entertainment.entertainmentType,
        indoorOutdoor: entertainment.indoorOutdoor,
        toddlerSuitability: entertainment.toddlerSuitability,
        geographicRelationship: relationship,
        matchReasons: reasons,
        tags: entertainment.planningTags,
        score,
      };
    })
    .filter((candidate): candidate is ScoredCandidate => Boolean(candidate))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, params.maxCandidates);
}

function retrieveComparisonCandidates(params: {
  repository: HannaKnowledgeRepository;
  explicitEntities: HannaResolvedEntity[];
  explicitRelatedIds: Set<string>;
  constraints: QueryConstraints;
}) {
  const primary = params.explicitEntities
    .filter((entity) => entity.entityType === "resort" || entity.entityType === "park" || entity.entityType === "area" || entity.entityType === "dining_location")
    .map((entity): ScoredCandidate | null => {
      const record = params.repository.findById(entity.id);
      if (!record || (!isResort(record) && record.entityType !== "park" && !isArea(record) && !isDining(record))) return null;
      return {
        id: record.id,
        name: record.name,
        entityType: record.entityType,
        locationName: isDining(record) ? locationName(record.locationId, params.repository) : undefined,
        serviceType: isDining(record) ? record.serviceType : undefined,
        cuisine: isDining(record) ? record.cuisine : undefined,
        mealPeriods: isDining(record) ? record.mealPeriods : undefined,
        costTier: isDining(record) ? record.costTier : undefined,
        costFreshness: isDining(record) ? record.costTierProvenance?.freshnessClass : undefined,
        toddlerFit: isDining(record) ? record.toddlerFit : undefined,
        reservationPlanning: isDining(record) ? record.reservationPlanning : undefined,
        geographicRelationship: "exact_location",
        matchReasons: ["comparison:explicit_option"],
        comparisonGroup: "comparison_option",
        transportationModes: isResort(record) ? record.transportationModes : undefined,
        tags: record.tags,
        score: 100,
      };
    })
    .filter((candidate): candidate is ScoredCandidate => Boolean(candidate));

  const transport = params.repository
    .listRecords()
    .filter(isTransport)
    .filter((connection) => params.explicitRelatedIds.has(connection.fromId) || params.explicitRelatedIds.has(connection.toId))
    .filter((connection) => !params.constraints.noBuses || !connection.modes.includes("bus"))
    .map((connection): ScoredCandidate => ({
      id: connection.id,
      name: connection.name,
      entityType: connection.entityType,
      geographicRelationship: "directly_connected",
      matchReasons: ["comparison:transportation_context"],
      comparisonGroup: "transportation_context",
      transportationModes: connection.modes,
      tags: connection.tags,
      score: 74,
    }));

  return [...primary, ...transport];
}

function retrievePlanningSignals(params: {
  repository: HannaKnowledgeRepository;
  relatedIds: Set<string>;
  contexts: Set<string>;
  toddlerContext: boolean;
  maxSignals: number;
}) {
  return params.repository
    .listRecords()
    .filter(isSignal)
    .map((signal) => {
      if (signal.contexts.includes("toddler") && !params.toddlerContext) return { signal, score: 0 };
      const entityOverlap = signal.appliesToIds.filter((id) => params.relatedIds.has(id)).length;
      const contextOverlap = signal.contexts.filter((context) => params.contexts.has(context)).length;
      if (entityOverlap === 0 || contextOverlap === 0) return { signal, score: 0 };
      let score = entityOverlap * 12 + contextOverlap * 8;
      if (signal.priority === "high") score += 6;
      return { signal, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.signal.name.localeCompare(b.signal.name))
    .slice(0, params.maxSignals)
    .map(({ signal }) => signal);
}

function liveGapsFor(kinds: HannaKnowledgeLiveGap["kind"][], entityId?: string): HannaKnowledgeLiveGap[] {
  return [...new Set(kinds)].map((kind) => {
    if (kind === "dining_reservation_availability") {
      return {
        kind,
        entityId,
        reason: "Dining reservation availability is live inventory and is not represented in Hanna's static knowledge.",
      };
    }
    if (kind === "current_menu_prices") {
      return {
        kind,
        entityId,
        reason: "Exact current menu prices require a live or freshly verified source.",
      };
    }
    if (kind === "current_menu") {
      return {
        kind,
        entityId,
        reason: "Current menu items require a live or freshly verified source.",
      };
    }
    return {
      kind,
      entityId,
      reason: "This is current operating information and requires a live source.",
    };
  });
}

function requestedUnknownKnowledge(message: string, resolvedEntities: HannaResolvedEntity[]) {
  const normalized = normalizeText(message);
  if (resolvedEntities.length > 0) return [];
  const knownAbsentEntities = [
    { phrase: "aunt pollys", label: "Aunt Polly's Dockside Inn" },
    { phrase: "aunt polly", label: "Aunt Polly's Dockside Inn" },
    { phrase: "lotus blossom cafe", label: "Lotus Blossom Cafe" },
  ];
  return knownAbsentEntities.filter((entity) => normalized.includes(entity.phrase)).map((entity) => entity.label);
}

function knowledgeGapsFor(params: {
  message: string;
  domains: Set<string>;
  resolvedEntities: HannaResolvedEntity[];
  candidates: HannaKnowledgeCandidate[];
}): HannaKnowledgeGap[] {
  const gaps = requestedUnknownKnowledge(params.message, params.resolvedEntities).map((requested) => ({
    kind: "knowledge_gap" as const,
    requested,
    reason: "Hanna's current trusted V1 knowledge catalog does not contain a record for this requested Disney entity.",
  }));
  if (params.domains.has("dining") && params.candidates.length === 0 && gaps.length === 0) {
    gaps.push({
      kind: "knowledge_gap",
      requested: "dining options matching the stated constraints",
      reason: "Hanna's current trusted V1 knowledge catalog does not contain enough matching dining records for this request.",
    });
  }
  return gaps;
}

function compactCandidate(candidate: ScoredCandidate): HannaKnowledgeCandidate {
  const { score: _score, ...compact } = candidate;
  return compact;
}

export class HannaKnowledgeRetrievalService implements HannaKnowledgeService {
  constructor(private readonly repository: HannaKnowledgeRepository = createStaticHannaKnowledgeRepository()) {}

  retrieve(input: HannaKnowledgeRetrievalInput): HannaKnowledgeContext {
    const maxCandidates = Math.min(input.maxCandidates ?? DEFAULT_MAX_CANDIDATES, HARD_MAX_CANDIDATES);
    const maxSignals = Math.min(input.maxSignals ?? DEFAULT_MAX_SIGNALS, HARD_MAX_SIGNALS);
    const constraints = analyzeConstraints(input.latestUserMessage);
    const priorContext = constraints.followUpToPriorCandidates ? recentUserContext(input) : "";
    const intent = detectHannaKnowledgeIntent(`${priorContext} ${input.latestUserMessage}`);
    const currentIntent = detectHannaKnowledgeIntent(input.latestUserMessage);
    const explicitEntities = resolveHannaEntities(input.latestUserMessage, this.repository);
    const priorEntities = constraints.followUpToPriorCandidates ? resolveHannaEntities(priorContext, this.repository) : [];
    const resolvedEntities = [...explicitEntities, ...priorEntities.filter((entity) => !explicitEntities.some((current) => current.id === entity.id))];
    const explicitComparableCount = explicitEntities.filter((entity) => entity.entityType === "resort" || entity.entityType === "park" || entity.entityType === "area" || entity.entityType === "dining_location").length;
    const comparisonMode = currentIntent.comparisonMode || intent.comparisonMode || (!constraints.nearbyAllowed && normalizeText(input.latestUserMessage).includes(" or ") && explicitComparableCount >= 2);
    const domains = new Set(intent.domains);
    if (resolvedEntities.some((entity) => entity.entityType === "dining_location")) domains.add("dining");
    if (resolvedEntities.some((entity) => entity.entityType === "attraction")) domains.add("attraction");
    if (resolvedEntities.some((entity) => entity.entityType === "entertainment")) domains.add("entertainment");
    if (comparisonMode) domains.add("geography");

    const lodgingIds = lodgingContextIds(input.latestUserMessage, explicitEntities);
    const explicitNonLodgingIds = explicitEntities.map((entity) => entity.id).filter((id) => !lodgingIds.has(id));
    const explicitTargetIds = new Set(explicitNonLodgingIds.length > 0 ? explicitNonLodgingIds : explicitEntities.map((entity) => entity.id));
    const priorTargetIds = new Set(priorEntities.map((entity) => entity.id));
    const stateIds = stateContextIds(input, this.repository);
    const targetIdsForScoring = explicitTargetIds.size > 0 ? explicitTargetIds : priorTargetIds;
    const stateRelatedIds = explicitTargetIds.size > 0 ? new Set<string>() : relatedIdsFor(new Set([...priorTargetIds, ...stateIds]), this.repository);
    const explicitRelatedIds = relatedIdsFor(new Set([...explicitTargetIds, ...priorTargetIds, ...explicitEntities.map((entity) => entity.id)]), this.repository);
    const toddlerContext = currentIntent.toddlerContext || hasYoungChild(input);
    const familyContext = toddlerContext || hasAnyChild(input) || currentIntent.domains.includes("family");
    const contexts = new Set<string>([
      ...domains,
      ...(familyContext ? ["family"] : []),
      ...(toddlerContext ? ["toddler", "stroller", "nap"] : []),
      ...(constraints.lateNightContext ? ["late_night"] : []),
      ...(intent.mealPeriod ? [intent.mealPeriod] : []),
      ...(explicitRelatedIds.has("park_epcot") || targetIdsForScoring.has("park_epcot") ? ["epcot_day"] : []),
      ...(explicitRelatedIds.has("park_magic_kingdom") || targetIdsForScoring.has("park_magic_kingdom") ? ["magic_kingdom"] : []),
      ...(explicitRelatedIds.has("park_hollywood_studios") || targetIdsForScoring.has("park_hollywood_studios") ? ["hollywood_studios"] : []),
      ...(explicitRelatedIds.has("park_animal_kingdom") || targetIdsForScoring.has("park_animal_kingdom") ? ["animal_kingdom"] : []),
      ...(explicitRelatedIds.has("area_epcot_world_showcase") || targetIdsForScoring.has("area_epcot_world_showcase") ? ["world_showcase"] : []),
      ...(constraints.budgetConscious ? ["budget"] : []),
      ...(constraints.pickyEaterContext ? ["selective_eater", "simple_foods"] : []),
      ...(constraints.specialDining || constraints.specialOccasion ? ["special_occasion"] : []),
      ...(constraints.requestedServiceTypes.includes("character_dining") ? ["character_dining"] : []),
      ...(constraints.noBuses || constraints.nearbyAllowed ? ["transportation"] : []),
      ...(constraints.indoorPreferred ? ["weather", "indoor", "cool_down"] : []),
      ...(constraints.restPreferred ? ["rest", "nap", "low_energy"] : []),
      ...(constraints.discoveryContext ? ["discovery"] : []),
      ...(constraints.priorityRequest ? ["priority", "pacing"] : []),
      ...(normalizeText(input.latestUserMessage).includes("morning") || normalizeText(input.latestUserMessage).includes("first thing") ? ["morning"] : []),
    ]);

    const diningCandidates = domains.has("dining") && !constraints.discoveryContext
      ? retrieveDiningCandidates({
          repository: this.repository,
          explicitTargetIds: targetIdsForScoring,
          stateRelatedIds,
          constraints,
          toddlerContext,
          mealPeriod: intent.mealPeriod,
          maxCandidates,
        })
      : [];

    const comparisonCandidates = comparisonMode
      ? retrieveComparisonCandidates({
          repository: this.repository,
          explicitEntities: resolvedEntities,
          explicitRelatedIds: relatedIdsFor(new Set(resolvedEntities.map((entity) => entity.id)), this.repository),
          constraints,
        })
      : [];

    const attractionCandidates = domains.has("attraction") || domains.has("height") || domains.has("weather") || domains.has("rest") || domains.has("pacing") || domains.has("discovery")
      ? retrieveAttractionCandidates({
          repository: this.repository,
          explicitTargetIds: targetIdsForScoring,
          stateRelatedIds,
          constraints,
          toddlerContext,
          familyContext,
          maxCandidates,
        })
      : [];

    const entertainmentCandidates = domains.has("entertainment")
      ? retrieveEntertainmentCandidates({
          repository: this.repository,
          explicitTargetIds: targetIdsForScoring,
          stateRelatedIds,
          constraints,
          toddlerContext,
          maxCandidates,
        })
      : [];

    const scoredCandidates = [...comparisonCandidates, ...diningCandidates, ...attractionCandidates, ...entertainmentCandidates]
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, maxCandidates);
    const unknownRequests = requestedUnknownKnowledge(input.latestUserMessage, resolvedEntities);
    const candidates = unknownRequests.length > 0 ? [] : scoredCandidates.map(compactCandidate);

    const planningSignals = retrievePlanningSignals({
      repository: this.repository,
      relatedIds: new Set([...relatedIdsFor(new Set(resolvedEntities.map((entity) => entity.id)), this.repository), ...candidates.map((candidate) => candidate.id)]),
      contexts,
      toddlerContext,
      maxSignals,
    });

    const resolvedDiningId = resolvedEntities.find((entity) => entity.entityType === "dining_location")?.id;
    const resolvedLiveEntityId = resolvedDiningId ?? resolvedEntities.find((entity) => entity.entityType === "attraction" || entity.entityType === "entertainment")?.id;
    return buildHannaKnowledgeContext({
      domains: [...domains],
      resolvedEntities,
      candidates,
      planningSignals,
      liveGaps: liveGapsFor(intent.liveRequests, resolvedLiveEntityId),
      knowledgeGaps: knowledgeGapsFor({
        message: input.latestUserMessage,
        domains,
        resolvedEntities,
        candidates,
      }),
    });
  }
}

export function createHannaKnowledgeService(repository?: HannaKnowledgeRepository) {
  return new HannaKnowledgeRetrievalService(repository);
}

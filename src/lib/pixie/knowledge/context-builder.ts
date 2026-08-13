import type { HannaKnowledgeCandidate, HannaKnowledgeContext, HannaPlanningSignal } from "@/lib/pixie/knowledge/types";

function compactPricing(candidate: HannaKnowledgeCandidate) {
  if (!candidate.pricing) return undefined;
  const { provenance: _provenance, notes, ...pricing } = candidate.pricing;
  return {
    ...pricing,
    priceStatus: candidate.pricing.provenance.status,
    freshness: candidate.pricing.provenance.freshnessClass,
    notes: notes?.slice(0, 2),
  };
}

export function buildHannaKnowledgeContext(input: {
  domains: HannaKnowledgeContext["domains"];
  resolvedEntities: HannaKnowledgeContext["resolvedEntities"];
  candidates: HannaKnowledgeCandidate[];
  planningSignals: HannaPlanningSignal[];
  liveGaps: HannaKnowledgeContext["liveGaps"];
  knowledgeGaps: HannaKnowledgeContext["knowledgeGaps"];
}): HannaKnowledgeContext {
  return {
    source: "hanna_v1_static",
    domains: input.domains,
    resolvedEntities: input.resolvedEntities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      entityType: entity.entityType,
      matchedAlias: entity.matchedAlias,
    })),
    candidates: input.candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      entityType: candidate.entityType,
      locationName: candidate.locationName,
      serviceType: candidate.serviceType,
      cuisine: candidate.cuisine,
      mealPeriods: candidate.mealPeriods,
      costTier: candidate.costTier,
      costFreshness: candidate.costFreshness,
      pricing: compactPricing(candidate),
      toddlerFit: candidate.toddlerFit,
      reservationPlanning: candidate.reservationPlanning,
      attractionType: candidate.attractionType,
      entertainmentType: candidate.entertainmentType,
      heightRequirement: candidate.heightRequirement,
      typicalAudience: candidate.typicalAudience,
      indoorOutdoor: candidate.indoorOutdoor,
      physicalIntensity: candidate.physicalIntensity,
      toddlerSuitability: candidate.toddlerSuitability,
      geographicRelationship: candidate.geographicRelationship,
      matchReasons: candidate.matchReasons?.slice(0, 5),
      comparisonGroup: candidate.comparisonGroup,
      transportationModes: candidate.transportationModes,
      tags: candidate.tags?.slice(0, 6),
    })),
    planningSignals: input.planningSignals.map((signal) => ({
      id: signal.id,
      shortReason: signal.shortReason,
      contexts: signal.contexts.slice(0, 6),
      appliesTo: signal.appliesToIds,
      priority: signal.priority,
    })),
    liveGaps: input.liveGaps,
    knowledgeGaps: input.knowledgeGaps,
  };
}

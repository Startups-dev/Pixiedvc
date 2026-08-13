import type { HannaDiningCostTier, HannaDiningPricing, HannaKnowledgeCandidate } from "@/lib/pixie/knowledge";
import type { PixieTripState } from "@/lib/pixie/schema";

export type MealCostEstimate = {
  subtotalLow: number;
  subtotalHigh: number;
  currency: "USD";
  assumptions: string[];
  includesTax: false;
  includesGratuity: false;
  confidence: "high" | "medium" | "low";
  provenance: HannaDiningPricing["provenance"];
};

export type DailyFoodBudgetEstimate = MealCostEstimate & {
  mealComponents: Array<{ label: string; low: number; high: number }>;
};

const pricingReviewProvenance: HannaDiningPricing["provenance"] = {
  sourceType: "curated_hanna",
  freshnessClass: "refreshable",
  status: "needs_review",
  verifiedAt: "2026-08-13",
};

const tierEstimateByCost: Record<HannaDiningCostTier, HannaDiningPricing["planningEstimate"]> = {
  value: { adultLow: 14, adultHigh: 22, childLow: 8, childHigh: 14, currency: "USD", basis: "quick_service_meal" },
  moderate: { adultLow: 28, adultHigh: 48, childLow: 12, childHigh: 22, currency: "USD", basis: "adult_meal" },
  expensive: { adultLow: 45, adultHigh: 75, childLow: 24, childHigh: 45, currency: "USD", basis: "fixed_meal" },
  premium: { adultLow: 70, adultHigh: 110, childLow: 39, childHigh: 70, currency: "USD", basis: "adult_meal" },
};

function pricing(
  pricingType: HannaDiningPricing["pricingType"],
  priceTier: HannaDiningCostTier,
  estimate: NonNullable<HannaDiningPricing["planningEstimate"]>,
  options: Partial<Pick<HannaDiningPricing, "fixedPrice" | "confidence" | "notes">> = {},
): HannaDiningPricing {
  return {
    pricingType,
    priceTier,
    planningEstimate: estimate,
    fixedPrice: options.fixedPrice,
    includesTax: false,
    includesGratuity: false,
    lastReviewedAt: "2026-08-13",
    confidence: options.confidence ?? "medium",
    provenance: pricingReviewProvenance,
    notes: options.notes,
  };
}

export const HANNA_DINING_PRICING_BY_ID: Record<string, HannaDiningPricing> = {
  dining_via_napoli: pricing("a_la_carte", "moderate", { adultLow: 30, adultHigh: 48, childLow: 0, childHigh: 16, currency: "USD", basis: "adult_meal" }, {
    notes: ["Planning estimate assumes adult pizza/pasta-style ordering; a toddler may share or need a small extra item."],
  }),
  dining_garden_grill: pricing("character_dining", "expensive", { adultLow: 62, adultHigh: 70, childLow: 40, childHigh: 45, currency: "USD", basis: "fixed_meal" }, {
    fixedPrice: { adult: 66, child: 43, childAgeMin: 3, childAgeMax: 9, mealPeriod: "dinner", currency: "USD" },
    confidence: "medium",
    notes: ["Fixed-price estimate models children under 3 as not charged from this dining price model."],
  }),
  dining_biergarten: pricing("buffet", "expensive", { adultLow: 49, adultHigh: 55, childLow: 27, childHigh: 31, currency: "USD", basis: "fixed_meal" }, {
    fixedPrice: { adult: 49, child: 27, childAgeMin: 3, childAgeMax: 9, mealPeriod: "dinner", currency: "USD" },
  }),
  dining_chef_mickeys: pricing("character_dining", "expensive", { adultLow: 58, adultHigh: 70, childLow: 36, childHigh: 45, currency: "USD", basis: "fixed_meal" }, {
    fixedPrice: { adult: 66, child: 41, childAgeMin: 3, childAgeMax: 9, mealPeriod: "dinner", currency: "USD" },
  }),
  dining_be_our_guest: pricing("prix_fixe", "premium", { adultLow: 70, adultHigh: 75, childLow: 40, childHigh: 45, currency: "USD", basis: "fixed_meal" }, {
    fixedPrice: { adult: 72, child: 43, childAgeMin: 3, childAgeMax: 9, mealPeriod: "dinner", currency: "USD" },
  }),
  dining_cinderella_royal_table: pricing("character_dining", "premium", { adultLow: 80, adultHigh: 95, childLow: 45, childHigh: 55, currency: "USD", basis: "fixed_meal" }, {
    fixedPrice: { adult: 84, child: 49, childAgeMin: 3, childAgeMax: 9, mealPeriod: "dinner", currency: "USD" },
  }),
  dining_trattoria_al_forno: pricing("a_la_carte", "moderate", { adultLow: 28, adultHigh: 45, childLow: 10, childHigh: 18, currency: "USD", basis: "adult_meal" }),
  dining_beaches_and_cream: pricing("a_la_carte", "moderate", { adultLow: 24, adultHigh: 38, childLow: 9, childHigh: 17, currency: "USD", basis: "adult_meal" }),
  dining_liberty_tree_tavern: pricing("family_style", "moderate", { adultLow: 42, adultHigh: 46, childLow: 24, childHigh: 27, currency: "USD", basis: "fixed_meal" }, {
    fixedPrice: { adult: 42, child: 24, childAgeMin: 3, childAgeMax: 9, mealPeriod: "dinner", currency: "USD" },
  }),
  dining_crystal_palace: pricing("character_dining", "expensive", { adultLow: 59, adultHigh: 65, childLow: 38, childHigh: 42, currency: "USD", basis: "fixed_meal" }, {
    fixedPrice: { adult: 62, child: 40, childAgeMin: 3, childAgeMax: 9, mealPeriod: "dinner", currency: "USD" },
  }),
  dining_regal_eagle: pricing("quick_service", "value", { adultLow: 16, adultHigh: 24, childLow: 8, childHigh: 14, currency: "USD", basis: "quick_service_meal" }),
  dining_connections_eatery: pricing("quick_service", "value", { adultLow: 15, adultHigh: 23, childLow: 8, childHigh: 14, currency: "USD", basis: "quick_service_meal" }),
  dining_columbia_harbour_house: pricing("quick_service", "value", { adultLow: 16, adultHigh: 24, childLow: 8, childHigh: 14, currency: "USD", basis: "quick_service_meal" }),
  dining_caseys_corner: pricing("quick_service", "value", { adultLow: 13, adultHigh: 22, childLow: 8, childHigh: 13, currency: "USD", basis: "quick_service_meal" }),
  dining_sunshine_seasons: pricing("quick_service", "value", { adultLow: 15, adultHigh: 23, childLow: 8, childHigh: 14, currency: "USD", basis: "quick_service_meal" }),
  dining_les_halles: pricing("quick_service", "value", { adultLow: 14, adultHigh: 24, childLow: 7, childHigh: 14, currency: "USD", basis: "quick_service_meal" }),
  dining_space_220: pricing("prix_fixe", "premium", { adultLow: 55, adultHigh: 85, childLow: 29, childHigh: 35, currency: "USD", basis: "fixed_meal" }),
  dining_california_grill: pricing("prix_fixe", "premium", { adultLow: 90, adultHigh: 110, childLow: 40, childHigh: 55, currency: "USD", basis: "fixed_meal" }),
};

export function pricingForCandidate(candidate: Pick<HannaKnowledgeCandidate, "id" | "costTier" | "serviceType">): HannaDiningPricing | undefined {
  const curated = HANNA_DINING_PRICING_BY_ID[candidate.id];
  if (curated) return curated;
  if (!candidate.costTier) return undefined;
  return pricing(candidate.serviceType === "quick_service" ? "quick_service" : "mixed", candidate.costTier, tierEstimateByCost[candidate.costTier], { confidence: "low" });
}

function ageGroupCounts(state: PixieTripState, overridePartySize?: number) {
  if (overridePartySize !== undefined) return { adults: overridePartySize, chargedChildren: 0, underThree: 0 };
  const knownAdults = state.party.adults ?? 0;
  const travellers = state.party.travellers;
  const knownChildren = state.party.children ?? travellers.filter((traveller) => traveller.ageGroup !== "adult" && traveller.ageGroup !== "unknown").length;
  let chargedChildren = 0;
  let adultPricedChildren = 0;
  let underThree = 0;
  for (const traveller of travellers) {
    if (traveller.age === undefined) continue;
    if (traveller.age < 3) underThree += 1;
    else if (traveller.age <= 9) chargedChildren += 1;
    else if (traveller.age < 18) adultPricedChildren += 1;
  }
  const unagedChildren = Math.max(0, knownChildren - chargedChildren - adultPricedChildren - underThree);
  return { adults: knownAdults + adultPricedChildren, chargedChildren: chargedChildren + unagedChildren, underThree };
}

export function estimateMealCost(input: { pricing: HannaDiningPricing; state: PixieTripState; mealPeriod?: string; partySizeOverride?: number }): MealCostEstimate {
  const counts = ageGroupCounts(input.state, input.partySizeOverride);
  const assumptions = ["Estimate is before tax and gratuity."];
  const fixed = input.pricing.fixedPrice;
  if (fixed && (!fixed.mealPeriod || !input.mealPeriod || fixed.mealPeriod === input.mealPeriod)) {
    const subtotalLow = counts.adults * fixed.adult + counts.chargedChildren * (fixed.child ?? fixed.adult);
    if (counts.underThree > 0) assumptions.push("Children under 3 are modeled as not charged for this fixed-price estimate.");
    return { subtotalLow, subtotalHigh: subtotalLow, currency: "USD", assumptions, includesTax: false, includesGratuity: false, confidence: input.pricing.confidence, provenance: input.pricing.provenance };
  }

  const estimate = input.pricing.planningEstimate;
  if (!estimate) {
    return { subtotalLow: 0, subtotalHigh: 0, currency: "USD", assumptions: ["No numeric planning estimate is available."], includesTax: false, includesGratuity: false, confidence: "low", provenance: input.pricing.provenance };
  }
  const toddlerLow = counts.underThree > 0 ? 0 : 0;
  const toddlerHigh = counts.underThree > 0 ? Math.min(16, estimate.childHigh ?? estimate.adultHigh) * counts.underThree : 0;
  if (counts.underThree > 0) assumptions.push("For a toddler under 3, range assumes sharing at the low end or adding a small item at the high end.");
  return {
    subtotalLow: counts.adults * estimate.adultLow + counts.chargedChildren * (estimate.childLow ?? estimate.adultLow) + toddlerLow,
    subtotalHigh: counts.adults * estimate.adultHigh + counts.chargedChildren * (estimate.childHigh ?? estimate.adultHigh) + toddlerHigh,
    currency: "USD",
    assumptions,
    includesTax: false,
    includesGratuity: false,
    confidence: input.pricing.confidence,
    provenance: input.pricing.provenance,
  };
}

export function estimateDailyFoodBudget(input: { state: PixieTripState; quickServiceMeals?: number; tableServiceMeals?: number; snacksPerPerson?: number; breakfastInRoom?: boolean }): DailyFoodBudgetEstimate {
  const counts = ageGroupCounts(input.state);
  const people = counts.adults + counts.chargedChildren + counts.underThree;
  const components: DailyFoodBudgetEstimate["mealComponents"] = [];
  const quickMeals = input.quickServiceMeals ?? 1;
  const tableMeals = input.tableServiceMeals ?? 1;
  if (!input.breakfastInRoom) components.push({ label: "breakfast", low: people * 8, high: people * 18 });
  if (quickMeals) components.push({ label: "quick service", low: quickMeals * (counts.adults * 14 + counts.chargedChildren * 8), high: quickMeals * (counts.adults * 24 + counts.chargedChildren * 14 + counts.underThree * 10) });
  if (tableMeals) components.push({ label: "table service", low: tableMeals * (counts.adults * 30 + counts.chargedChildren * 12), high: tableMeals * (counts.adults * 55 + counts.chargedChildren * 25 + counts.underThree * 14) });
  if (input.snacksPerPerson) components.push({ label: "snacks", low: people * input.snacksPerPerson * 5, high: people * input.snacksPerPerson * 10 });
  const subtotalLow = components.reduce((sum, component) => sum + component.low, 0);
  const subtotalHigh = components.reduce((sum, component) => sum + component.high, 0);
  return {
    subtotalLow,
    subtotalHigh,
    currency: "USD",
    assumptions: ["Daily range varies by ordering style and is before tax and gratuity.", ...(input.breakfastInRoom ? ["Breakfast in the room is excluded."] : [])],
    includesTax: false,
    includesGratuity: false,
    confidence: "medium",
    provenance: pricingReviewProvenance,
    mealComponents: components,
  };
}

export function estimateFitsBudget(estimate: MealCostEstimate, maximum: number) {
  if (estimate.subtotalHigh <= maximum) return "fits" as const;
  if (estimate.subtotalLow <= maximum) return "overlaps" as const;
  return "exceeds" as const;
}

import { describe, expect, it } from "vitest";

import { estimateDailyFoodBudget, estimateFitsBudget, estimateMealCost, pricingForCandidate } from "@/lib/pixie/dining";
import { createHannaKnowledgeService } from "@/lib/pixie/knowledge";
import { createFakeLiveDisneyProvider, createLiveDisneyService } from "@/lib/pixie/live";
import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";

describe("Dining planning pricing", () => {
  const now = "2026-08-13T14:00:00.000Z";

  function stateWithChild(age: number) {
    return normalizePixieTripState({
      ...createEmptyPixieTripState(now),
      party: {
        adults: 2,
        children: 1,
        travellers: [{ id: `child_${age}`, label: `${age}-year-old`, age, ageGroup: age <= 5 ? "preschooler" : "child" }],
      },
    });
  }

  it("Case A estimates an à-la-carte family meal without false precision", () => {
    const pricing = pricingForCandidate({ id: "dining_via_napoli", costTier: "moderate", serviceType: "table_service" })!;
    const estimate = estimateMealCost({ pricing, state: stateWithChild(2), mealPeriod: "dinner" });

    expect(estimate).toMatchObject({
      subtotalLow: 60,
      subtotalHigh: 112,
      currency: "USD",
      includesTax: false,
      includesGratuity: false,
    });
    expect(estimate.assumptions.join(" ")).toMatch(/toddler under 3/i);
  });

  it("Case B calculates fixed-price dinner for a 2-year-old without child charge", () => {
    const pricing = pricingForCandidate({ id: "dining_chef_mickeys", costTier: "expensive", serviceType: "character_dining" })!;
    const estimate = estimateMealCost({ pricing, state: stateWithChild(2), mealPeriod: "dinner" });

    expect(estimate.subtotalLow).toBe(132);
    expect(estimate.subtotalHigh).toBe(132);
    expect(estimate.assumptions.join(" ")).toMatch(/under 3/i);
  });

  it("Case C applies child pricing for age 5 where fixed child pricing is modeled", () => {
    const pricing = pricingForCandidate({ id: "dining_chef_mickeys", costTier: "expensive", serviceType: "character_dining" })!;
    const estimate = estimateMealCost({ pricing, state: stateWithChild(5), mealPeriod: "dinner" });

    expect(estimate.subtotalLow).toBe(173);
    expect(estimate.subtotalHigh).toBe(173);
  });

  it("Case D treats age 10 as adult-priced in modeled fixed-price estimates", () => {
    const pricing = pricingForCandidate({ id: "dining_garden_grill", costTier: "expensive", serviceType: "character_dining" })!;
    const estimate = estimateMealCost({ pricing, state: stateWithChild(10), mealPeriod: "dinner" });

    expect(estimate.subtotalLow).toBe(198);
    expect(estimate.subtotalHigh).toBe(198);
  });

  it("Case E and F classifies hard budget fits and overlaps", () => {
    const pricing = pricingForCandidate({ id: "dining_via_napoli", costTier: "moderate", serviceType: "table_service" })!;
    const estimate = estimateMealCost({ pricing, state: stateWithChild(2), mealPeriod: "dinner" });

    expect(estimateFitsBudget(estimate, 100)).toBe("overlaps");
    expect(estimateFitsBudget(estimate, 120)).toBe("fits");
    expect(estimateFitsBudget(estimate, 50)).toBe("exceeds");
  });

  it("Case G keeps exact-current requests live-required while preserving planning estimate", async () => {
    const message = "How much is dinner at Chef Mickey's right now?";
    const state = stateWithChild(2);
    const knowledgeContext = createHannaKnowledgeService().retrieve({ latestUserMessage: message, currentState: state });

    const liveContext = await createLiveDisneyService().retrieve({ latestUserMessage: message, currentState: state, knowledgeContext, now });

    expect(knowledgeContext.candidates[0]?.pricing?.planningEstimate).toBeDefined();
    expect(liveContext.unavailable[0]).toMatchObject({ kind: "current_price", status: "live_source_unavailable" });
  });

  it("Case H accepts fake live current price without replacing planning data", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.setDining("dining_chef_mickeys", {
      kind: "current_price",
      priceSummary: "Adult dinner currently listed at $66; child dinner currently listed at $41.",
      menuItems: [{ name: "Dinner", price: "$66 adult / $41 child" }],
    });
    const message = "How much is dinner at Chef Mickey's right now?";
    const state = stateWithChild(5);
    const knowledgeContext = createHannaKnowledgeService().retrieve({ latestUserMessage: message, currentState: state });

    const liveContext = await createLiveDisneyService({ provider }).retrieve({ latestUserMessage: message, currentState: state, knowledgeContext, now });

    expect(knowledgeContext.candidates[0]?.pricing?.planningEstimate).toBeDefined();
    expect(liveContext.diningCurrent[0]).toMatchObject({ kind: "current_price", priceSummary: expect.stringContaining("$66") });
  });

  it("Case I gives Garden Grill toddler fit plus numeric planning pricing in context", () => {
    const message = "Is Garden Grill good with our toddler and what will dinner cost?";
    const state = stateWithChild(2);
    const context = createHannaKnowledgeService().retrieve({ latestUserMessage: message, currentState: state });

    expect(context.candidates[0]).toMatchObject({
      id: "dining_garden_grill",
      toddlerFit: "strong",
      pricing: { fixedPrice: { adult: 66, child: 43 } },
    });
  });

  it("Case J estimates a bounded daily food budget", () => {
    const estimate = estimateDailyFoodBudget({ state: stateWithChild(2), breakfastInRoom: true, quickServiceMeals: 1, tableServiceMeals: 1 });

    expect(estimate.subtotalLow).toBe(88);
    expect(estimate.subtotalHigh).toBe(182);
    expect(estimate.assumptions.join(" ")).toMatch(/Breakfast in the room is excluded/i);
  });

  it("Case L supports per-party override when total family size is supplied explicitly", () => {
    const pricing = pricingForCandidate({ id: "dining_via_napoli", costTier: "moderate", serviceType: "table_service" })!;
    const estimate = estimateMealCost({ pricing, state: createEmptyPixieTripState(now), mealPeriod: "dinner", partySizeOverride: 5 });

    expect(estimate.subtotalLow).toBe(150);
    expect(estimate.subtotalHigh).toBe(240);
  });

  it("Case N bounds large fake live menu price responses", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.setDining("dining_via_napoli", {
      kind: "current_price",
      menuItems: Array.from({ length: 30 }, (_, index) => ({ name: `Item ${index + 1}`, price: `$${index + 10}` })),
    });
    const message = "How much is pizza at Via Napoli right now?";
    const state = stateWithChild(2);
    const knowledgeContext = createHannaKnowledgeService().retrieve({ latestUserMessage: message, currentState: state });

    const liveContext = await createLiveDisneyService({ provider }).retrieve({ latestUserMessage: message, currentState: state, knowledgeContext, now });

    expect(liveContext.diningCurrent[0]?.menuItems).toHaveLength(8);
  });
});

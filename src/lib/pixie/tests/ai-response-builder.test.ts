import { describe, expect, it } from "vitest";

import { buildPixiePlannerResponse } from "@/lib/pixie/ai/response-builder";
import type { PixieModelTurnResult } from "@/lib/pixie/ai/schemas";
import type { PixieToolResult } from "@/lib/pixie/ai/tool-contract";
import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";
import type { PixieRecommendationResult } from "@/lib/pixie/resorts/recommendation-service";

function modelResult(overrides: Partial<PixieModelTurnResult> = {}): PixieModelTurnResult {
  return {
    assistantResponse: "That helps narrow it down. What accommodation budget should I use?",
    tripPatch: {},
    requestedTools: [],
    nextQuestionKey: "ask_budget_context",
    planningIntent: "collect_information",
    conversationMode: "discovery",
    activeDecisionKey: "budget",
    delightMomentKey: "none",
    confidence: 0.7,
    warnings: [],
    ...overrides,
  };
}

function recommendationResult(): PixieRecommendationResult {
  const state = normalizePixieTripState({
    ...createEmptyPixieTripState("2026-07-15T12:00:00.000Z"),
    dates: { arrivalDate: "2026-10-10", departureDate: "2026-10-17" },
    party: { adults: 2, children: 2 },
    preferences: { parkPriorities: ["EPCOT"], poolImportance: "high", vacationPace: "balanced" },
  });
  return {
    recommendations: [
      {
        recommendationId: "pixie-rec-bcv-studio",
        resortId: "bcv",
        resortSlug: "beach-club-villas",
        displayName: "Beach Club Villas",
        rank: 1,
        score: 92,
        eligibleRoomTypes: [],
        recommendedRoomType: {
          id: "deluxe_studio",
          displayName: "Deluxe Studio",
          calculatorRoomCode: "DELUXESTUDIO",
          standardCapacity: 4,
          maximumCapacity: 5,
          bedroomCount: 0,
          kitchenLevel: "kitchenette",
          laundryAvailability: "shared",
          calculatorSupported: true,
        },
        estimatedPoints: null,
        estimatedGuestPrice: null,
        budgetFit: "budget_context_missing",
        reasonCodes: ["near_priority_park", "strong_pool_match"],
        explanationFragments: ["It keeps EPCOT very convenient.", "The pool fit is strong for this family."],
        tradeoffs: ["Budget fit will improve after accommodation budget context is known."],
        warnings: [],
        dataQuality: ["partial"],
        pricingStatus: "not_requested",
        calculatorStatus: "not_requested",
        scoringBreakdown: [],
      },
    ],
    excludedResorts: [],
    warnings: [],
    inputSummary: { destination: "walt_disney_world", partySize: 4, budgetType: "unknown" },
    recommendationReadiness: evaluatePixieCompleteness(state),
    generatedAt: "2026-07-15T12:00:00.000Z",
    scoringVersion: "test",
    catalogVersion: "test",
    pricingVersion: "test",
    calculatorCoverage: { supportedYears: [2026] },
  };
}

describe("Pixie response builder", () => {
  it("normalizes raw Markdown markers for the plain-text renderer", () => {
    const state = createEmptyPixieTripState("2026-07-15T12:00:00.000Z");
    const response = buildPixiePlannerResponse({
      modelResult: modelResult({ assistantResponse: "**4 park days**\n- Keep one pool afternoon.\nWhat dates are you thinking?" }),
      completeness: evaluatePixieCompleteness(state),
      toolResults: [],
      warnings: [],
    });

    expect(response.message).toContain("4 park days");
    expect(response.message).toContain("Keep one pool afternoon.");
    expect(response.message).not.toMatch(/\*\*|^-/m);
    expect(response.warnings).toContain("assistant_formatting_normalized: markdown markers were removed for the current plain-text renderer.");
  });

  it("introduces trusted resort recommendations without changing ranking or numeric facts", () => {
    const result = recommendationResult();
    const response = buildPixiePlannerResponse({
      modelResult: modelResult({
        assistantResponse: "What would you like to do with this resort shortlist?",
        requestedTools: [{ name: "recommend_resorts", input: {} }],
        planningIntent: "recommend_resorts",
        conversationMode: "recommendation",
        activeDecisionKey: "resort_choice",
      }),
      completeness: result.recommendationReadiness,
      toolResults: [
        {
          ok: true,
          toolName: "recommend_resorts",
          result,
          durationMs: 1,
          trusted: true,
        } satisfies PixieToolResult,
      ],
      warnings: [],
    });

    expect(response.message).toContain("Beach Club Villas");
    expect(response.message).toContain("It keeps your priority parks convenient");
    expect(response.message).toContain("The main tradeoff");
    expect(response.message).toContain("What would you like to do with this resort shortlist?");
    expect(response.message).not.toContain("92");
  });

  it("does not prepend the resort intro to routine discovery turns just because implicit recommendations ran", () => {
    const result = recommendationResult();
    const response = buildPixiePlannerResponse({
      modelResult: modelResult({ assistantResponse: "That gives me enough to compare resorts. What accommodation budget should I use?" }),
      completeness: result.recommendationReadiness,
      toolResults: [
        {
          ok: true,
          toolName: "recommend_resorts",
          result,
          durationMs: 1,
          trusted: true,
        } satisfies PixieToolResult,
      ],
      warnings: [],
    });

    expect(response.message).toBe("That gives me enough to compare resorts. What accommodation budget should I use?");
  });

  it("does not prepend the resort intro to dining decision-support turns", () => {
    const result = recommendationResult();
    const response = buildPixiePlannerResponse({
      modelResult: modelResult({
        assistantResponse: "For steak, I would keep the evening near the EPCOT resort area and verify current dining options closer to the trip.",
        planningIntent: "general_disney_planning",
        conversationMode: "decision_support",
        activeDecisionKey: "resort_choice",
      }),
      completeness: result.recommendationReadiness,
      toolResults: [
        {
          ok: true,
          toolName: "recommend_resorts",
          result,
          durationMs: 1,
          trusted: true,
        } satisfies PixieToolResult,
      ],
      latestUserMessage: "I like steak. You decide where we should eat.",
      warnings: [],
    });

    expect(response.message).toBe("For steak, I would keep the evening near the EPCOT resort area and verify current dining options closer to the trip.");
  });

  it("removes mechanical questions for facts the completeness engine already knows", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-07-15T12:00:00.000Z"),
      dates: { arrivalDate: "2026-10-10", departureDate: "2026-10-17" },
      party: { adults: 2, children: 2 },
      preferences: { parkPriorities: ["EPCOT"], poolImportance: "high", vacationPace: "balanced" },
    });
    const response = buildPixiePlannerResponse({
      modelResult: modelResult({ assistantResponse: "That gives me a good picture. When are you traveling? What accommodation budget should I use?" }),
      completeness: evaluatePixieCompleteness(state),
      toolResults: [],
      warnings: [],
    });

    expect(response.message).not.toContain("When are you traveling?");
    expect(response.message).toContain("What accommodation budget should I use?");
  });
});

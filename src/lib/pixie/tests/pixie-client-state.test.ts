import { describe, expect, it } from "vitest";

import {
  applyPixieStreamEvent,
  beginPixieTurn,
  createInitialPixieChatState,
  recentMessagesFromClient,
  resetPixieChatState,
} from "@/lib/pixie/client/chat-state";
import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { createEmptyPixieTripState } from "@/lib/pixie/planner-state";
import type { PixiePlannerTurnResult } from "@/lib/pixie/ai/orchestrator";
import { emptyPixieUsage } from "@/lib/pixie/ai/usage";
import type { PixieRecommendationResult } from "@/lib/pixie/resorts/recommendation-service";
import type { PixieReadyStayMatchResult } from "@/lib/pixie/ready-stays/types";

const TEST_TURN_ID = "pixie_turn_test";

function turnResult(overrides: Partial<PixiePlannerTurnResult> = {}): PixiePlannerTurnResult {
  const state = createEmptyPixieTripState("2026-07-12T12:00:00.000Z");
  const completeness = evaluatePixieCompleteness(state);
  return {
    assistantResponse: "I updated your plan.",
    updatedState: state,
    completeness,
    planningStage: completeness.planningStage,
    toolResults: [],
    warnings: [],
    usage: emptyPixieUsage("openai", "gpt-5.6-sol", "test-prompt"),
    turnId: TEST_TURN_ID,
    generatedAt: "2026-07-12T12:00:00.000Z",
    ...overrides,
  };
}

function recommendationFixture(): PixieRecommendationResult {
  return {
    recommendations: [
      {
        recommendationId: "pixie-rec-vgf-deluxe-studio",
        resortId: "vgf",
        resortSlug: "grand-floridian",
        displayName: "Grand Floridian Villas",
        rank: 1,
        score: 88,
        eligibleRoomTypes: [],
        recommendedRoomType: {
          id: "deluxe_studio",
          displayName: "Deluxe Studio",
          calculatorRoomCode: "Deluxe Studio",
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
        reasonCodes: ["near_priority_park"],
        explanationFragments: ["Close to a priority park."],
        tradeoffs: ["Final fit depends on confirmed DVC availability."],
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
    recommendationReadiness: evaluatePixieCompleteness(createEmptyPixieTripState("2026-07-12T12:00:00.000Z")),
    generatedAt: "2026-07-12T12:00:00.000Z",
    scoringVersion: "test",
    catalogVersion: "test",
    pricingVersion: "test",
    calculatorCoverage: { supportedYears: [2027] },
  };
}

function readyStayFixture(): PixieReadyStayMatchResult {
  return {
    matches: [],
    groups: { exact: [], flexible: [], alternatives: [] },
    excludedListings: [],
    warnings: [],
    inputSummary: { partySize: 4, flexibleDates: false },
    readiness: { ready: true, warnings: [] },
    generatedAt: "2026-07-12T12:00:00.000Z",
    matchingVersion: "test",
    pricingSource: "ready_stay_listing_price",
    visibilitySource: "public_showcase",
    inventoryDisclaimerKey: "recheck_required_before_booking",
  };
}

describe("Pixie client chat state", () => {
  it("starts with the Pixie introduction and an empty valid draft", () => {
    const state = createInitialPixieChatState({ draftId: "draft_test" });
    expect(state.draftId).toBe("draft_test");
    expect(state.messages[0]?.content).toMatch(/Hi, I.m Pixie/i);
    expect(state.tripState.destination).toBe("walt_disney_world");
    expect(state.status).toBe("idle");
  });

  it("sending a message adds one user message and caps recent messages", () => {
    const state = beginPixieTurn(createInitialPixieChatState(), "We are two adults.");
    expect(state.status).toBe("sending");
    expect(state.messages.filter((message) => message.role === "user")).toHaveLength(1);
    expect(state.recentMessages.at(-1)?.content).toBe("We are two adults.");
  });

  it("assistant text is not duplicated when the final turn completes", () => {
    let state = beginPixieTurn(createInitialPixieChatState(), "Hi");
    state = applyPixieStreamEvent(state, { type: "turn_started", turnId: TEST_TURN_ID });
    state = applyPixieStreamEvent(state, { type: "assistant_text_delta", turnId: TEST_TURN_ID, text: "I updated your plan." });
    state = applyPixieStreamEvent(state, { type: "turn_completed", turnId: TEST_TURN_ID, result: turnResult() });
    state = applyPixieStreamEvent(state, { type: "turn_completed", turnId: TEST_TURN_ID, result: turnResult() });

    expect(state.status).toBe("idle");
    expect(state.messages.filter((message) => message.role === "assistant" && message.content === "I updated your plan.")).toHaveLength(1);
    expect(state.currentAssistantText).toBe("");
  });

  it("updates trusted recommendations, Ready Stay matches, and plan outline from events", () => {
    let state = createInitialPixieChatState();
    const recommendations = recommendationFixture();
    const readyStayMatches = readyStayFixture();
    state = applyPixieStreamEvent(state, { type: "turn_started", turnId: TEST_TURN_ID });
    state = applyPixieStreamEvent(state, { type: "recommendations_ready", turnId: TEST_TURN_ID, recommendations });
    state = applyPixieStreamEvent(state, { type: "ready_stays_ready", turnId: TEST_TURN_ID, readyStayMatches });
    state = applyPixieStreamEvent(state, { type: "plan_outline_ready", turnId: TEST_TURN_ID, planOutline: { days: [] } });

    expect(state.recommendations?.recommendations[0]?.resortId).toBe("vgf");
    expect(state.readyStayMatches?.inventoryDisclaimerKey).toBe("recheck_required_before_booking");
    expect(state.planOutline).toEqual({ days: [] });
  });

  it("ignores stale events from an older turn", () => {
    let state = beginPixieTurn(createInitialPixieChatState(), "Hi");
    state = applyPixieStreamEvent(state, { type: "turn_started", turnId: "turn_new" });
    state = applyPixieStreamEvent(state, { type: "assistant_text_delta", turnId: "turn_old", text: "Old response" });
    state = applyPixieStreamEvent(state, { type: "turn_completed", turnId: "turn_old", result: turnResult({ turnId: "turn_old" }) });

    expect(state.currentAssistantText).toBe("");
    expect(state.messages.some((message) => message.content === "Old response")).toBe(false);
    expect(state.activeTurnId).toBe("turn_new");
  });

  it("ignores final results with mismatched turn identifiers", () => {
    let state = beginPixieTurn(createInitialPixieChatState(), "Hi");
    state = applyPixieStreamEvent(state, { type: "turn_started", turnId: "turn_new" });
    state = applyPixieStreamEvent(state, { type: "turn_completed", turnId: "turn_new", result: turnResult({ turnId: "turn_other" }) });

    expect(state.status).toBe("thinking");
    expect(state.messages.some((message) => message.content === "I updated your plan.")).toBe(false);
    expect(state.activeTurnId).toBe("turn_new");
  });

  it("clears stale recommendations when a new turn begins", () => {
    let state = createInitialPixieChatState();
    const recommendations = recommendationFixture();
    state = applyPixieStreamEvent(state, { type: "turn_started", turnId: TEST_TURN_ID });
    state = applyPixieStreamEvent(state, { type: "recommendations_ready", turnId: TEST_TURN_ID, recommendations });
    expect(state.recommendations).toBeDefined();

    state = beginPixieTurn(state, "Change our dates.");
    expect(state.recommendations).toBeUndefined();
    expect(state.readyStayMatches).toBeUndefined();
    expect(state.planOutline).toBeUndefined();
  });

  it("preserves composer input after a failure when requested", () => {
    let state = beginPixieTurn(createInitialPixieChatState(), "My dates are...");
    state = applyPixieStreamEvent(state, { type: "turn_started", turnId: TEST_TURN_ID });
    state = applyPixieStreamEvent(state, {
      type: "turn_failed",
      turnId: TEST_TURN_ID,
      error: { code: "provider_timeout", message: "Pixie is having trouble responding right now." },
    });

    expect(state.status).toBe("error");
    expect(state.error?.code).toBe("provider_timeout");
  });

  it("recent messages exclude status messages and remain capped", () => {
    const messages = Array.from({ length: 10 }, (_, index) => ({
      id: `m_${index}`,
      role: index === 0 ? ("status" as const) : index % 2 === 0 ? ("assistant" as const) : ("user" as const),
      content: `message ${index}`,
      createdAt: "2026-07-12T12:00:00.000Z",
    }));
    const recent = recentMessagesFromClient(messages);
    expect(recent).toHaveLength(6);
    expect(recent.some((message) => message.content === "message 0")).toBe(false);
  });

  it("reset returns a fresh valid chat state", () => {
    const state = resetPixieChatState();
    expect(state.tripState.schemaVersion).toBe(1);
    expect(state.messages[0]?.role).toBe("assistant");
    expect(state.hasSentFirstMessage).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { pixieModelTurnResultSchema } from "@/lib/pixie/ai/schemas";

describe("Pixie structured model output", () => {
  it("rejects unknown output fields", () => {
    expect(() =>
      pixieModelTurnResultSchema.parse({
        assistantResponse: "Hello.",
        tripPatch: {},
        requestedTools: [],
        planningIntent: "collect_information",
        confidence: 0.5,
        warnings: [],
        secret: "nope",
      }),
    ).toThrow();
  });

  it("rejects missing required output fields", () => {
    expect(() => pixieModelTurnResultSchema.parse({ assistantResponse: "Hello." })).toThrow();
  });

  it("rejects protected generated-state patches", () => {
    expect(() =>
      pixieModelTurnResultSchema.parse({
        assistantResponse: "I found a price.",
        tripPatch: { generated: { resortRecommendations: [] } },
        requestedTools: [],
        planningIntent: "update_trip",
        confidence: 0.4,
        warnings: [],
      }),
    ).toThrow();
  });

  it("allows approved tool requests only", () => {
    expect(() =>
      pixieModelTurnResultSchema.parse({
        assistantResponse: "I'll check resorts.",
        tripPatch: {},
        requestedTools: [{ name: "run_sql", input: {} }],
        planningIntent: "recommend_resorts",
        confidence: 0.8,
        warnings: [],
      }),
    ).toThrow();
  });

  it("accepts strict concierge strategy metadata", () => {
    const parsed = pixieModelTurnResultSchema.parse({
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
    });

    expect(parsed.conversationMode).toBe("discovery");
    expect(parsed.activeDecisionKey).toBe("budget");
    expect(parsed.delightMomentKey).toBe("none");
  });

  it("rejects unknown concierge strategy metadata", () => {
    expect(() =>
      pixieModelTurnResultSchema.parse({
        assistantResponse: "Hello.",
        tripPatch: {},
        requestedTools: [],
        planningIntent: "collect_information",
        conversationMode: "sales_push",
        activeDecisionKey: "budget",
        delightMomentKey: "none",
        confidence: 0.5,
        warnings: [],
      }),
    ).toThrow();
  });
});

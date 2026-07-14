import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PixieAiException } from "@/lib/pixie/ai/errors";
import { createFixturePixieProvider } from "@/lib/pixie/ai/provider";
import { runPixiePlannerTurn, streamPixiePlannerTurn } from "@/lib/pixie/ai/orchestrator";
import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";

describe("Pixie AI orchestrator", () => {
  const originalPixieModel = process.env.PIXIE_MODEL;

  beforeEach(() => {
    process.env.PIXIE_MODEL = "gpt-5.6-sol";
  });

  afterEach(() => {
    if (originalPixieModel === undefined) delete process.env.PIXIE_MODEL;
    else process.env.PIXIE_MODEL = originalPixieModel;
  });

  it("applies dates and party from a structured model patch", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-07-11T12:00:00.000Z"),
      message: "We are going September 7 to 12 with two adults and two kids.",
      provider: createFixturePixieProvider({
        result: {
          assistantResponse: "Great, I added your dates and party.",
          tripPatch: {
            dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
            party: { adults: 2, children: 2 },
            preferences: { resortPriorities: ["family friendly"] },
          },
          requestedTools: ["get_planner_status"].map((name) => ({ name: name as "get_planner_status", input: {} })),
          nextQuestionKey: "ask_budget_context",
          planningIntent: "update_trip",
          confidence: 0.8,
          warnings: [],
        },
      }),
      now: "2026-07-11T12:01:00.000Z",
    });
    expect(result.updatedState.dates.numberOfNights).toBe(5);
    expect(result.updatedState.party.totalPartySize).toBe(4);
    expect(result.toolResults.some((tool) => tool.toolName === "get_planner_status")).toBe(true);
  });

  it("invalid model patch preserves previous state and returns warning", async () => {
    const state = createEmptyPixieTripState("2026-07-11T12:00:00.000Z");
    const result = await runPixiePlannerTurn({
      state,
      message: "We depart before we arrive.",
      provider: createFixturePixieProvider({
        result: {
          assistantResponse: "I need to clarify your dates.",
          tripPatch: { dates: { arrivalDate: "2027-09-12", departureDate: "2027-09-07" } },
          requestedTools: [],
          nextQuestionKey: "ask_dates",
          planningIntent: "clarify_information",
          confidence: 0.4,
          warnings: [],
        },
      }),
      now: "2026-07-11T12:01:00.000Z",
    });
    expect(result.updatedState.dates.arrivalDate).toBeUndefined();
    expect(result.warnings.join(" ")).toMatch(/Patch rejected/);
  });

  it("recommendation-ready state calls deterministic resort recommendations", async () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-07-11T12:00:00.000Z"),
      dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
      party: { adults: 2, children: 2 },
      preferences: { resortPriorities: ["monorail"], parkPriorities: ["Magic Kingdom"] },
    });
    const result = await runPixiePlannerTurn({
      state,
      message: "What resorts fit?",
      provider: createFixturePixieProvider({
        result: {
          assistantResponse: "I’ll compare trusted resort options.",
          tripPatch: {},
          requestedTools: [{ name: "recommend_resorts", input: {} }],
          planningIntent: "recommend_resorts",
          confidence: 0.8,
          warnings: [],
        },
      }),
      now: "2026-07-11T12:01:00.000Z",
    });
    expect(result.recommendations?.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations?.recommendations[0].score).toBeTypeOf("number");
  });

  it("provider failure emits a typed stream failure instead of a completed fallback turn", async () => {
    const state = createEmptyPixieTripState("2026-07-11T12:00:00.000Z");
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state,
      message: "Help",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
    })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual(["turn_started", "turn_failed"]);
    const failed = events.at(-1);
    expect(failed?.type).toBe("turn_failed");
    if (failed?.type === "turn_failed") {
      expect(failed.error.code).toBe("provider_timeout");
      expect(failed.error.message).toBe("OpenAI provider request timed out.");
    }
  });

  it("streaming contract emits final authoritative result", async () => {
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-07-11T12:00:00.000Z"),
      message: "Hi",
      provider: createFixturePixieProvider({
        result: {
          assistantResponse: "When would you like to travel?",
          tripPatch: {},
          requestedTools: [],
          nextQuestionKey: "ask_dates",
          planningIntent: "collect_information",
          confidence: 0.8,
          warnings: [],
        },
      }),
    })) {
      events.push(event);
    }
    expect(events[0]?.type).toBe("turn_started");
    expect(events.at(-1)?.type).toBe("turn_completed");
    const started = events[0];
    const completed = events.at(-1);
    expect(started?.turnId).toMatch(/^pixie_turn_/);
    expect(completed?.turnId).toBe(started?.turnId);
    if (completed?.type === "turn_completed") {
      expect(completed.result.turnId).toBe(started?.turnId);
    }
    expect(events.every((event) => event.turnId === started?.turnId)).toBe(true);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PixieAiException } from "@/lib/pixie/ai/errors";
import { createFixturePixieProvider, type PixieModelOptions, type PixiePlannerTurnInput } from "@/lib/pixie/ai/provider";
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

  function successfulProvider(onCall?: (input: PixiePlannerTurnInput, options?: PixieModelOptions) => void) {
    return {
      async createPlannerTurn(input: PixiePlannerTurnInput, options?: PixieModelOptions) {
        onCall?.(input, options);
        return {
          result: {
            assistantResponse: "I can work with those details.",
            tripPatch: {},
            requestedTools: [],
            planningIntent: "update_trip" as const,
            confidence: 0.8,
            warnings: [],
          },
          metadata: {
            provider: "fixture",
            model: "fixture-model",
            promptVersion: "fixture-prompt",
            sourceVersion: "fixture",
          },
          usage: {
            provider: "fixture",
            model: "fixture-model",
            promptVersion: "fixture-prompt",
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          },
        };
      },
    };
  }

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

  it("does not call resort recommendations for a narrow DVC cancellation question", async () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      dates: { arrivalDate: "2026-09-01", departureDate: "2026-09-06" },
      party: { adults: 2, children: 1 },
      preferences: { resortPriorities: ["monorail"], parkPriorities: ["Magic Kingdom"] },
    });
    const result = await runPixiePlannerTurn({
      state,
      message: "How will I cancel Saratoga? Won't we be in the non-cancelling window soon?",
      provider: createFixturePixieProvider({
        result: {
          assistantResponse: "You are right to check the cancellation window before changing Saratoga.",
          tripPatch: {},
          requestedTools: [{ name: "recommend_resorts", input: {} }],
          planningIntent: "revise_plan",
          conversationMode: "decision_support",
          activeDecisionKey: "resort_choice",
          confidence: 0.8,
          warnings: [],
        },
      }),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.toolResults.some((tool) => tool.toolName === "recommend_resorts")).toBe(false);
    expect(result.recommendations).toBeUndefined();
    expect(result.assistantResponse).toMatch(/^You are right to check/);
  });

  it("passes compact Hanna knowledge context to the provider after lightweight extraction", async () => {
    let providerInput: PixiePlannerTurnInput | undefined;
    await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      message:
        "We're staying at BoardWalk and going to EPCOT. Give me 5 actual restaurants for dinner with our 2 year old.",
      provider: successfulProvider((input) => {
        providerInput = input;
      }),
      now: "2026-08-12T12:01:00.000Z",
    });

    expect(providerInput?.knowledgeContext?.domains).toEqual(expect.arrayContaining(["dining", "family"]));
    expect(providerInput?.knowledgeContext?.resolvedEntities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "resort_boardwalk_villas" }),
        expect.objectContaining({ id: "park_epcot" }),
      ]),
    );
    expect(providerInput?.knowledgeContext?.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "dining_via_napoli" }),
        expect.objectContaining({ id: "dining_garden_grill" }),
      ]),
    );
    expect(providerInput?.knowledgeContext?.candidates.length).toBeLessThanOrEqual(8);
  });

  it("passes compact DVC rule context to the provider for narrow DVC turns", async () => {
    let providerInput: PixiePlannerTurnInput | undefined;
    await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      message: "I own at BoardWalk. Can I book BoardWalk for December 15 2028?",
      provider: successfulProvider((input) => {
        providerInput = input;
      }),
      now: "2026-08-13T12:01:00.000Z",
    });

    expect(providerInput?.dvcContext?.source).toBe("pixie_dvc_rules_v1");
    expect(providerInput?.dvcContext?.results.length).toBeLessThanOrEqual(4);
    expect(providerInput?.dvcContext?.results[0]).toMatchObject({
      reasonCodes: expect.arrayContaining(["HOME_RESORT", "BOOKING_WINDOW_NOT_OPEN"]),
    });
    expect(providerInput?.dvcContext?.results[0]?.factsUsed).toEqual(expect.arrayContaining([expect.objectContaining({ label: "homeOpenDate" })]));
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

  it("streams lightweight trip extraction before a later provider failure", async () => {
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message:
        "We are planning October 28 through November 4, 2026. Bay Lake Tower is 18 points, Polynesian is 22 points, and Bay Lake has a waitlist. We have a Magic Kingdom Halloween party and want to minimize resort changes, save points, and stay near Magic Kingdom.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual(["turn_started", "trip_patch_applied", "turn_failed"]);
    const patchEvent = events[1];
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.dates.arrivalDate).toBe("2026-10-28");
      expect(patchEvent.updatedState.dates.departureDate).toBe("2026-11-04");
      expect(patchEvent.updatedState.preferences.preferredResorts).toEqual(expect.arrayContaining(["Bay Lake Tower", "Polynesian Villas"]));
      expect(patchEvent.updatedState.preferences.parkPriorities).toContain("Magic Kingdom");
      expect(patchEvent.updatedState.preferences.resortPriorities).toEqual(
        expect.arrayContaining(["minimize resort changes", "save points where reasonable", "stay near Magic Kingdom"]),
      );
      expect(patchEvent.updatedState.preferences.generalNotes).toContain("Point values mentioned");
      expect(patchEvent.updatedState.preferences.generalNotes).toContain("Waitlist alternatives mentioned");
      expect(patchEvent.updatedState.party.totalPartySize).toBeUndefined();
      expect(patchEvent.updatedState.budget.budgetType).toBe("unknown");
    }
  });

  it("extracts DVC planning workspace facts before a later provider failure", async () => {
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message:
        "September Use Year. Current-year 9 points remaining, next-year 220 points, borrowing contemplated. Saratoga Studio Sept 1-2 is 9 points and traveler availability says BoardWalk Studio Sept 3 is available for 10 points. Sept 5 unresolved. BLT waitlist Sept 1. Worried about Holding if we cancel Saratoga inside 30 days.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    const patchEvent = events.find((event) => event.type === "trip_patch_applied");
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.dvcContext.useYear).toBe("September");
      expect(patchEvent.updatedState.dvcContext.currentUseYearPoints?.points).toBe(9);
      expect(patchEvent.updatedState.dvcContext.nextUseYearPoints?.points).toBe(220);
      expect(patchEvent.updatedState.dvcContext.borrowingContemplated).toBe(true);
      expect(patchEvent.updatedState.dvcContext.borrowedPoints).toBeUndefined();
      expect(patchEvent.updatedState.planningWorkspace.workingItinerary.some((night) => night.date === "2026-09-05" && night.status === "unresolved")).toBe(true);
      expect(patchEvent.updatedState.planningWorkspace.availabilityObservations[0]?.source).toBe("traveler_reported");
      expect(patchEvent.updatedState.planningWorkspace.availabilityObservations[0]?.source).not.toBe("HannaDVC_verified");
      expect(patchEvent.updatedState.planningWorkspace.activeDecisions.some((decision) => decision.id === "dvc_cancellation_modification_risk")).toBe(true);
    }
  });

  it("does not retain stale complete dates when a new message contains unparsed September availability dates", async () => {
    const previousState = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      dates: { arrivalDate: "2026-10-28", departureDate: "2026-11-04" },
    });
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: previousState,
      message:
        "Sept 1 has Bay Lake Tower for 18 points. Sept 2 has Polynesian for 22 points. Sept 3 has Copper Creek. Sept 4 has BoardWalk. Sept 5 only waitlists. We want to save points.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    const patchEvent = events.find((event) => event.type === "trip_patch_applied");
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.dates.arrivalDate).toBeUndefined();
      expect(patchEvent.updatedState.dates.departureDate).toBeUndefined();
      expect(patchEvent.updatedState.dates.numberOfNights).toBeUndefined();
      expect(patchEvent.updatedState.preferences.generalNotes).toContain("Sept 1");
      expect(patchEvent.updatedState.preferences.generalNotes).not.toContain("Oct 28");
    }
  });

  it("extracts explicit arrival without fabricating checkout from availability dates", async () => {
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message:
        "Arriving Sept 1, 2026. Sept 2 has Bay Lake Tower. Sept 3 has Polynesian. Sept 4 has Copper Creek. Sept 5 only waitlists.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    const patchEvent = events.find((event) => event.type === "trip_patch_applied");
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.dates.arrivalDate).toBe("2026-09-01");
      expect(patchEvent.updatedState.dates.departureDate).toBeUndefined();
      expect(patchEvent.updatedState.dates.numberOfNights).toBeUndefined();
      expect(patchEvent.updatedState.preferences.generalNotes).toContain("Sept 5");
    }
  });

  it("extracts explicit checkout when supplied without keeping stale arrival", async () => {
    const previousState = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      dates: { arrivalDate: "2026-10-28", departureDate: "2026-11-04" },
    });
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: previousState,
      message: "Checking out Sept 5, 2026. Bay Lake Tower has waitlists and we want to save points.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    const patchEvent = events.find((event) => event.type === "trip_patch_applied");
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.dates.arrivalDate).toBeUndefined();
      expect(patchEvent.updatedState.dates.departureDate).toBe("2026-09-05");
      expect(patchEvent.updatedState.dates.numberOfNights).toBeUndefined();
    }
  });

  it("extracts clear me-wife-and-two-year-old party details", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "It is for me, my wife and my 2 year old.",
      provider: successfulProvider(),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.updatedState.party.adults).toBe(2);
    expect(result.updatedState.party.children).toBe(1);
    expect(result.updatedState.party.totalPartySize).toBe(3);
    expect(result.updatedState.party.travellers).toHaveLength(1);
    expect(result.updatedState.party.travellers[0]?.age).toBe(2);
    expect(result.updatedState.party.travellers[0]?.category).toBe("child");
  });

  it("extracts a two-year-old without inventing unknown adults or total party size", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "We're at Magic Kingdom with our 2-year-old and she missed her nap.",
      provider: successfulProvider(),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.updatedState.party.adults).toBeUndefined();
    expect(result.updatedState.party.adultCount).toBeUndefined();
    expect(result.updatedState.party.children).toBe(1);
    expect(result.updatedState.party.childCount).toBe(1);
    expect(result.updatedState.party.totalPartySize).toBeUndefined();
    expect(result.updatedState.party.travellers[0]).toMatchObject({ age: 2, category: "child", ageGroup: "preschooler" });
  });

  it("streams partial two-year-old traveler state without legacy zero-adult totals", async () => {
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "We're at Magic Kingdom with our 2-year-old and she missed her nap.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    const patchEvent = events.find((event) => event.type === "trip_patch_applied");
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.party.adultCount).toBeUndefined();
      expect(patchEvent.updatedState.party.childCount).toBe(1);
      expect(patchEvent.updatedState.party.totalPartySize).toBeUndefined();
      expect(patchEvent.updatedState.party.travellers[0]?.ageGroup).toBe("preschooler");
      expect(patchEvent.updatedState.party.ageGroupSummary?.infant).toBe(0);
    }
  });

  it("does not guess ambiguous traveler wording", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "It is for my family.",
      provider: successfulProvider(),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.updatedState.party.totalPartySize).toBeUndefined();
    expect(result.updatedState.party.travellers).toHaveLength(0);
  });

  it("keeps the normal provider timeout for simple planning turns", async () => {
    let timeoutMs: number | undefined;
    await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "We are two adults.",
      provider: successfulProvider((_, options) => {
        timeoutMs = options?.timeoutMs;
      }),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(timeoutMs).toBe(30_000);
  });

  it("uses a bounded extended provider timeout for complex multi-resort planning turns", async () => {
    let timeoutMs: number | undefined;
    await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message:
        "Sept 1 Bay Lake Tower 18 points, Sept 2 Polynesian 22 points, Sept 3 Copper Creek 17 points, Sept 4 BoardWalk 20 points, Sept 5 Riviera 23 points. There are waitlists, save points, and stay near Magic Kingdom.",
      provider: successfulProvider((_, options) => {
        timeoutMs = options?.timeoutMs;
      }),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(timeoutMs).toBe(45_000);
  });

  it("keeps valid lightweight facts when an extracted date range is invalid", async () => {
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message:
        "We are planning November 4 through October 28, 2026. Bay Lake Tower has a waitlist, costs 18 points, and we want to stay near Magic Kingdom.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    const patchEvent = events.find((event) => event.type === "trip_patch_applied");
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.dates.arrivalDate).toBeUndefined();
      expect(patchEvent.updatedState.preferences.preferredResorts).toContain("Bay Lake Tower");
      expect(patchEvent.updatedState.preferences.resortPriorities).toContain("stay near Magic Kingdom");
      expect(patchEvent.updatedState.preferences.generalNotes).toContain("18 points");
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

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createFixturePixieProvider, type PixiePlannerTurnInput } from "@/lib/pixie/ai/provider";
import { runPixiePlannerTurn } from "@/lib/pixie/ai/orchestrator";
import { createHannaKnowledgeService } from "@/lib/pixie/knowledge";
import { buildDiningAvailabilityQuery, createFakeLiveDisneyProvider, createLiveDisneyService, detectLiveDisneyIntents, parseDiningAvailabilityTimeWindow } from "@/lib/pixie/live";
import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";

describe("Dining reservation availability live layer", () => {
  const now = "2026-08-13T14:00:00.000Z";
  const originalPixieModel = process.env.PIXIE_MODEL;

  beforeEach(() => {
    process.env.PIXIE_MODEL = "gpt-5.6-sol";
  });

  afterEach(() => {
    if (originalPixieModel === undefined) delete process.env.PIXIE_MODEL;
    else process.env.PIXIE_MODEL = originalPixieModel;
  });

  function stateWithParty() {
    return normalizePixieTripState({
      ...createEmptyPixieTripState(now),
      dates: { arrivalDate: "2026-09-01", departureDate: "2026-09-06" },
      party: {
        adults: 2,
        children: 1,
        travellers: [{ id: "child_2", label: "2-year-old", age: 2, ageGroup: "preschooler" }],
      },
      preferences: { parkPriorities: ["EPCOT"] },
    });
  }

  function knowledge(message: string, state = stateWithParty()) {
    return createHannaKnowledgeService().retrieve({ latestUserMessage: message, currentState: state });
  }

  it("Case A normalizes a specific Via Napoli availability request", () => {
    const message = "Can I get Via Napoli around 6 PM September 3?";
    const currentState = stateWithParty();
    const context = knowledge(message, currentState);
    const intents = detectLiveDisneyIntents({ latestUserMessage: message, currentState, knowledgeContext: context, now });

    expect(intents[0]).toMatchObject({
      kind: "dining_reservation_availability",
      date: "2026-09-03",
      diningAvailabilityQuery: {
        date: "2026-09-03",
        partySize: 3,
        targetTime: "18:00",
        windowStart: "16:30",
        windowEnd: "19:30",
        restaurants: [expect.objectContaining({ id: "dining_via_napoli" })],
      },
    });
  });

  it("Case B lets explicit table size override traveler state", () => {
    const message = "We need a table for 5 at Via Napoli around 6 PM September 3.";
    const query = buildDiningAvailabilityQuery({ latestUserMessage: message, currentState: stateWithParty(), knowledgeContext: knowledge(message), now });

    expect(query.partySize).toBe(5);
  });

  it("Case C marks party size missing when provider would require it", () => {
    const message = "Can I get Via Napoli around 6 PM September 3?";
    const currentState = createEmptyPixieTripState(now);
    const query = buildDiningAvailabilityQuery({ latestUserMessage: message, currentState, knowledgeContext: knowledge(message, currentState), now });

    expect(query.missingRequiredFields).toEqual(expect.arrayContaining(["partySize"]));
    expect(query.partySize).toBeUndefined();
  });

  it("Case D maps nearby times inside the requested window", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.setDiningAvailability("dining_via_napoli", { availableTimes: [{ time: "17:40" }, { time: "18:30" }] });
    const message = "Can I get Via Napoli around 6 PM September 3?";

    const context = await createLiveDisneyService({ provider }).retrieve({
      latestUserMessage: message,
      currentState: stateWithParty(),
      knowledgeContext: knowledge(message),
      now,
    });

    expect(context.diningAvailability[0]).toMatchObject({
      diningLocation: { id: "dining_via_napoli" },
      availabilityState: "available",
      availableTimes: [{ time: "17:40" }, { time: "18:30" }],
    });
  });

  it("Case E represents no suitable availability without claiming a sellout", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.setDiningAvailability("dining_via_napoli", { availableTimes: [], availabilityState: "no_match_in_requested_window" });
    const message = "Can I get Via Napoli around 6 PM September 3?";

    const context = await createLiveDisneyService({ provider }).retrieve({
      latestUserMessage: message,
      currentState: stateWithParty(),
      knowledgeContext: knowledge(message),
      now,
    });

    expect(context.diningAvailability[0]).toMatchObject({
      availabilityState: "no_match_in_requested_window",
      availableTimes: [],
      status: "supported_live_result",
    });
  });

  it("Case F isolates provider errors while static dining candidates survive", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.fail("dining_reservation_availability", new Error("Availability source failed."));
    const message = "Find us a good dinner around 6 PM September 3.";
    const staticContext = knowledge(message);

    const context = await createLiveDisneyService({ provider }).retrieve({
      latestUserMessage: message,
      currentState: stateWithParty(),
      knowledgeContext: staticContext,
      now,
    });

    expect(staticContext.candidates).toEqual(expect.arrayContaining([expect.objectContaining({ entityType: "dining_location" })]));
    expect(context.errors[0]).toMatchObject({ kind: "dining_reservation_availability", status: "live_source_error" });
  });

  it("Case G detects Portuguese dining availability requests", () => {
    const message = "Tem Via Napoli por volta das 18h no dia 3 de setembro?";
    const currentState = stateWithParty();
    const intents = detectLiveDisneyIntents({ latestUserMessage: message, currentState, knowledgeContext: knowledge(message, currentState), now });

    expect(intents[0]).toMatchObject({
      kind: "dining_reservation_availability",
      diningAvailabilityQuery: { date: "2026-09-03", targetTime: "18:00" },
    });
  });

  it("Case H reuses short-lived identical availability queries from cache", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.setDiningAvailability("dining_via_napoli", { availableTimes: [{ time: "18:10" }] });
    const service = createLiveDisneyService({ provider });
    const message = "Can I get Via Napoli around 6 PM September 3?";
    const input = {
      latestUserMessage: message,
      currentState: stateWithParty(),
      knowledgeContext: knowledge(message),
      now,
    };

    await service.retrieve(input);
    await service.retrieve(input);

    expect(provider.calls).toHaveLength(1);
  });

  it("Case I bounds excessive availability slots before provider context", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.setDiningAvailability("dining_via_napoli", {
      availableTimes: Array.from({ length: 30 }, (_, index) => ({ time: `18:${index.toString().padStart(2, "0")}` })),
    });
    const message = "Can I get Via Napoli around 6 PM September 3?";

    const context = await createLiveDisneyService({ provider }).retrieve({
      latestUserMessage: message,
      currentState: stateWithParty(),
      knowledgeContext: knowledge(message),
      now,
    });

    expect(context.diningAvailability[0]?.availableTimes).toHaveLength(5);
  });

  it("Case J keeps production unsupported state explicit when no safe provider is configured", async () => {
    const message = "Can I get Via Napoli around 6 PM September 3?";
    const context = await createLiveDisneyService().retrieve({
      latestUserMessage: message,
      currentState: stateWithParty(),
      knowledgeContext: knowledge(message),
      now,
    });

    expect(context.unavailable[0]).toMatchObject({
      kind: "dining_reservation_availability",
      status: "live_source_unavailable",
    });
  });

  it("parses practical dining time windows", () => {
    expect(parseDiningAvailabilityTimeWindow("dinner")).toMatchObject({ targetTime: "18:00", windowStart: "17:00", windowEnd: "20:00" });
    expect(parseDiningAvailabilityTimeWindow("between 5 and 7 PM")).toMatchObject({ windowStart: "17:00", windowEnd: "19:00" });
    expect(parseDiningAvailabilityTimeWindow("after 7")).toMatchObject({ windowStart: "19:00" });
  });

  it("golden scenario passes bounded static candidates and fake availability to the provider", async () => {
    const liveProvider = createFakeLiveDisneyProvider();
    liveProvider.setDiningAvailability("dining_via_napoli", { availableTimes: [{ time: "18:10" }] });
    liveProvider.setDiningAvailability("dining_biergarten", { availableTimes: [{ time: "18:25" }] });
    let providerInput: PixiePlannerTurnInput | undefined;

    await runPixiePlannerTurn({
      state: stateWithParty(),
      message: "Find us a good dinner around 6 PM September 3.",
      provider: {
        async createPlannerTurn(input) {
          providerInput = input;
          return createFixturePixieProvider({
            result: {
              assistantResponse: "I found useful EPCOT dinner options and would choose Via Napoli.",
              tripPatch: {},
              requestedTools: [],
              planningIntent: "general_guidance",
              confidence: 0.8,
              warnings: [],
            },
          }).createPlannerTurn(input);
        },
      },
      liveDisneyService: createLiveDisneyService({ provider: liveProvider }),
      now,
    });

    expect(providerInput?.knowledgeContext?.candidates).toEqual(expect.arrayContaining([expect.objectContaining({ id: "dining_via_napoli" })]));
    expect(providerInput?.liveContext?.intents[0]?.diningAvailabilityQuery).toMatchObject({
      partySize: 3,
      date: "2026-09-03",
      targetTime: "18:00",
    });
    expect(providerInput?.liveContext?.diningAvailability.length).toBeLessThanOrEqual(6);
    expect(providerInput?.liveContext?.diningAvailability).toEqual(
      expect.arrayContaining([expect.objectContaining({ diningLocation: expect.objectContaining({ id: "dining_via_napoli" }) })]),
    );
  });
});

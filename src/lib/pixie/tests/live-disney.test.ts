import { describe, expect, it } from "vitest";

import { createHannaKnowledgeService } from "@/lib/pixie/knowledge";
import { createLiveDisneyService, detectLiveDisneyIntents } from "@/lib/pixie/live";
import { createFakeLiveDisneyProvider } from "@/lib/pixie/live/providers/fake";
import { createEmptyPixieTripState } from "@/lib/pixie/planner-state";

describe("Live Disney service", () => {
  const now = "2026-08-13T14:00:00.000Z";

  function knowledge(message: string) {
    return createHannaKnowledgeService().retrieve({
      latestUserMessage: message,
      currentState: createEmptyPixieTripState(now),
    });
  }

  it("Case A detects park-hours intent and returns park closing time", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.setParkHours("park_magic_kingdom", "2026-09-02", { openTime: "09:00", closeTime: "22:00" });
    const message = "What's Magic Kingdom's closing time September 2?";

    const context = await createLiveDisneyService({ provider }).retrieve({
      latestUserMessage: message,
      currentState: createEmptyPixieTripState(now),
      knowledgeContext: knowledge(message),
      now,
    });

    expect(context.intents).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "park_hours", date: "2026-09-02" })]));
    expect(context.parkHours[0]).toMatchObject({
      park: { id: "park_magic_kingdom" },
      date: "2026-09-02",
      closeTime: "22:00",
      status: "supported_live_result",
    });
  });

  it("Case B returns no-result instead of fabricating unpublished park hours", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.setUnavailable("park_hours", "park_epcot", "2027-12-31", "Schedule is not published.", "no_result");
    const message = "What time does EPCOT close on December 31 2027?";

    const context = await createLiveDisneyService({ provider }).retrieve({
      latestUserMessage: message,
      currentState: createEmptyPixieTripState(now),
      knowledgeContext: knowledge(message),
      now,
    });

    expect(context.parkHours).toHaveLength(0);
    expect(context.unavailable[0]).toMatchObject({ kind: "park_hours", status: "no_result", reason: "Schedule is not published." });
  });

  it("Case C does not call live data for static planning questions", async () => {
    const provider = createFakeLiveDisneyProvider();
    const message = "Is Magic Kingdom good with a 2-year-old?";

    const context = await createLiveDisneyService({ provider }).retrieve({
      latestUserMessage: message,
      currentState: createEmptyPixieTripState(now),
      knowledgeContext: knowledge(message),
      now,
    });

    expect(context.intents).toEqual([]);
    expect(provider.calls).toEqual([]);
  });

  it("Case D treats current attraction status as live and unavailable when unsupported", async () => {
    const provider = createFakeLiveDisneyProvider();
    const message = "Is Slinky Dog Dash open right now?";

    const context = await createLiveDisneyService({ provider }).retrieve({
      latestUserMessage: message,
      currentState: createEmptyPixieTripState(now),
      knowledgeContext: knowledge(message),
      now,
    });

    expect(context.intents[0]).toMatchObject({ kind: "attraction_status", entity: { id: "attr_hs_slinky_dog" } });
    expect(context.unavailable[0]).toMatchObject({ kind: "attraction_status", status: "live_source_unavailable" });
  });

  it("Case E does not fabricate current wait times", async () => {
    const provider = createFakeLiveDisneyProvider();
    const message = "What's Slinky Dog's wait right now?";

    const context = await createLiveDisneyService({ provider }).retrieve({
      latestUserMessage: message,
      currentState: createEmptyPixieTripState(now),
      knowledgeContext: knowledge(message),
      now,
    });

    expect(context.intents[0]).toMatchObject({ kind: "current_wait_time" });
    expect(context.attractionStatus).toHaveLength(0);
    expect(context.unavailable[0]).toMatchObject({ kind: "current_wait_time" });
  });

  it("Case F returns bounded entertainment showtimes when a provider supports them", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.setEntertainment("ent_ak_lion_king", "2026-09-03", [
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
      "19:00",
      "20:00",
      "21:00",
      "22:00",
    ]);
    const message = "What time is Festival of the Lion King on September 3?";

    const context = await createLiveDisneyService({ provider }).retrieve({
      latestUserMessage: message,
      currentState: createEmptyPixieTripState(now),
      knowledgeContext: knowledge(message),
      now,
    });

    expect(context.entertainment[0]).toMatchObject({ experience: { id: "ent_ak_lion_king" }, date: "2026-09-03" });
    expect(context.entertainment[0]?.times).toHaveLength(12);
  });

  it("Case G returns bounded current dining price data when a provider supports it", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.setDining("dining_via_napoli", {
      kind: "current_price",
      menuItems: Array.from({ length: 12 }, (_, index) => ({ name: `Item ${index + 1}`, price: `$${index + 10}` })),
    });
    const message = "How much is pizza at Via Napoli right now?";

    const context = await createLiveDisneyService({ provider }).retrieve({
      latestUserMessage: message,
      currentState: createEmptyPixieTripState(now),
      knowledgeContext: knowledge(message),
      now,
    });

    expect(context.diningCurrent[0]).toMatchObject({ kind: "current_price", diningLocation: { id: "dining_via_napoli" } });
    expect(context.diningCurrent[0]?.menuItems).toHaveLength(8);
  });

  it("Case H preserves static restaurant retrieval when live current pricing fails", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.fail("current_price", new Error("Dining menu source failed."));
    const message = "Is Via Napoli good with our toddler and how much does dinner cost right now?";
    const staticContext = knowledge(message);

    const context = await createLiveDisneyService({ provider }).retrieve({
      latestUserMessage: message,
      currentState: createEmptyPixieTripState(now),
      knowledgeContext: staticContext,
      now,
    });

    expect(staticContext.candidates).toEqual(expect.arrayContaining([expect.objectContaining({ id: "dining_via_napoli" })]));
    expect(context.errors[0]).toMatchObject({ kind: "current_price", status: "live_source_error" });
  });

  it("Case I isolates provider timeouts", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.delay("park_hours", 25);
    const message = "What time does Magic Kingdom close September 2?";

    const context = await createLiveDisneyService({ provider, timeoutMs: 1 }).retrieve({
      latestUserMessage: message,
      currentState: createEmptyPixieTripState(now),
      knowledgeContext: knowledge(message),
      now,
    });

    expect(context.errors[0]).toMatchObject({ kind: "park_hours", status: "live_source_error" });
  });

  it("Case J detects Portuguese current-hours requests without translating proper nouns", () => {
    const message = "Que horas o Magic Kingdom fecha no dia 2 de setembro?";
    const intents = detectLiveDisneyIntents({ latestUserMessage: message, knowledgeContext: knowledge(message), now });

    expect(intents[0]).toMatchObject({ kind: "park_hours", entity: { name: "Magic Kingdom" }, date: "2026-09-02" });
  });

  it("Case K reuses cached park-hours lookups", async () => {
    const provider = createFakeLiveDisneyProvider();
    provider.setParkHours("park_magic_kingdom", "2026-09-02", { openTime: "09:00", closeTime: "22:00" });
    const service = createLiveDisneyService({ provider });
    const message = "What time does Magic Kingdom close September 2?";
    const input = {
      latestUserMessage: message,
      currentState: createEmptyPixieTripState(now),
      knowledgeContext: knowledge(message),
      now,
    };

    await service.retrieve(input);
    await service.retrieve(input);

    expect(provider.calls).toHaveLength(1);
  });
});

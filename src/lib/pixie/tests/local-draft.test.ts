import { describe, expect, it } from "vitest";

import { PIXIE_LIMITS, PIXIE_LOCAL_DRAFT_STORAGE_KEY, PIXIE_LOCAL_DRAFT_VERSION } from "@/lib/pixie/constants";
import { createEmptyPixieTripState } from "@/lib/pixie/planner-state";
import {
  deserializePixieDraft,
  migratePixieDraft,
  resetPixieDraft,
  serializePixieDraft,
} from "@/lib/pixie/local-draft";

describe("Pixie local draft versioning", () => {
  it("serializes and deserializes a valid state", () => {
    const state = createEmptyPixieTripState("2026-07-10T12:00:00.000Z");
    const json = serializePixieDraft(state, { now: "2026-07-10T13:00:00.000Z" });
    const parsedEnvelope = JSON.parse(json);

    expect(PIXIE_LOCAL_DRAFT_STORAGE_KEY).toBe("pixiedvc:pixie:draft:v1");
    expect(parsedEnvelope.draftVersion).toBe(PIXIE_LOCAL_DRAFT_VERSION);

    const result = deserializePixieDraft(json);
    expect(result.ok).toBe(true);
    expect(result.state.destination).toBe("walt_disney_world");
  });

  it("rejects corrupt JSON and oversized drafts safely", () => {
    const corrupt = deserializePixieDraft("{not json");
    expect(corrupt.ok).toBe(false);
    expect(corrupt.reason).toBe("corrupt_json");

    const oversized = deserializePixieDraft("x".repeat(PIXIE_LIMITS.maxLocalDraftBytes + 1));
    expect(oversized.ok).toBe(false);
    expect(oversized.reason).toBe("oversized");
  });

  it("handles unknown draft versions safely", () => {
    const result = deserializePixieDraft(JSON.stringify({ draftVersion: 999, state: createEmptyPixieTripState() }));

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unsupported_draft_version");
  });

  it("migrates a legacy draft envelope with state but no version", () => {
    const result = migratePixieDraft({ state: createEmptyPixieTripState("2026-07-10T12:00:00.000Z") });

    expect(result.ok).toBe(true);
    expect(result.recovered).toBe(true);
    expect(result.reason).toBe("migrated");
  });

  it("hydrates an older valid state without newer DVC fields", () => {
    const state = createEmptyPixieTripState("2026-07-10T12:00:00.000Z");
    const { contracts: _contracts, pointLots: _pointLots, ...olderDvcContext } = state.dvcContext;
    const result = migratePixieDraft({
      draftVersion: PIXIE_LOCAL_DRAFT_VERSION,
      savedAt: "2026-07-10T13:00:00.000Z",
      state: {
        ...state,
        dvcContext: olderDvcContext,
      },
      recentMessages: [],
    });

    expect(result.ok).toBe(true);
    expect(result.state.dvcContext.contracts).toEqual([]);
    expect(result.state.dvcContext.pointLots).toEqual([]);
  });

  it("salvages valid fields from schema-evolved partial stored state", () => {
    const state = createEmptyPixieTripState("2026-07-10T12:00:00.000Z");
    const result = migratePixieDraft({
      draftVersion: PIXIE_LOCAL_DRAFT_VERSION,
      savedAt: "2026-07-10T13:00:00.000Z",
      state: {
        ...state,
        futureTopLevel: "ignored",
        dates: { arrivalDate: "2027-04-01", departureDate: "2027-04-05", futureDateField: "ignored" },
        party: { travellers: [{ id: "traveller_child", category: "child", age: 2, futureTravellerField: "ignored" }] },
        dvcContext: { homeResort: "BoardWalk Villas", futureDvcField: "ignored" },
      },
      recentMessages: [],
    });

    expect(result.ok).toBe(true);
    expect(result.recovered).toBe(true);
    expect(result.reason).toBe("migrated");
    expect(result.state.dates.numberOfNights).toBe(4);
    expect(result.state.party.childCount).toBe(1);
    expect(result.state.party.adultCount).toBeUndefined();
    expect(result.state.party.totalPartySize).toBeUndefined();
    expect(result.state.dvcContext.homeResort).toBe("BoardWalk Villas");
  });

  it("resets to a fresh valid state", () => {
    const state = resetPixieDraft();

    expect(state.destination).toBe("walt_disney_world");
    expect(state.planningStage).toBe("new");
  });

  it("limits recent message summaries", () => {
    const state = createEmptyPixieTripState();
    const json = serializePixieDraft(state, {
      recentMessages: Array.from({ length: PIXIE_LIMITS.maxRecentDraftMessages + 2 }, (_, index) => ({
        role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
        content: `message ${index}`,
      })),
    });
    const parsed = JSON.parse(json);

    expect(parsed.recentMessages).toHaveLength(PIXIE_LIMITS.maxRecentDraftMessages);
    expect(parsed.recentMessages[0].content).toBe("message 2");
  });

  it("rejects arbitrary sensitive fields instead of serializing them", () => {
    const state = createEmptyPixieTripState();

    expect(() => serializePixieDraft({ ...state, secretPrompt: "do not store me", apiKey: "nope" } as typeof state)).toThrow(
      "Unrecognized key",
    );
  });

  it("rejects overlong recent message summaries", () => {
    expect(() =>
      serializePixieDraft(createEmptyPixieTripState(), {
        recentMessages: [{ role: "user", content: "x".repeat(PIXIE_LIMITS.maxRecentDraftMessageLength + 1) }],
      }),
    ).toThrow();
  });

  it("returns a fresh state for missing drafts", () => {
    const result = deserializePixieDraft(null);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("empty");
    expect(result.state.planningStage).toBe("new");
  });

  it("does not silently accept invalid draft state", () => {
    const result = deserializePixieDraft(
      JSON.stringify({
        draftVersion: PIXIE_LOCAL_DRAFT_VERSION,
        savedAt: "2026-07-10T12:00:00.000Z",
        state: { schemaVersion: 1, destination: "made_up_destination" },
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_state");
  });
});

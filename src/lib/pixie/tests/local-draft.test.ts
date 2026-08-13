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

  it("preserves V2 planning workspace sections through draft persistence", () => {
    const state = createEmptyPixieTripState("2026-07-10T12:00:00.000Z");
    state.planningWorkspace = {
      ...state.planningWorkspace,
      lodgingPlans: [{ id: "lodging_bay_lake", resort: "Bay Lake Tower", status: "selected", source: "explicit_user" }],
      parkPlans: [{ id: "park_2026_09_03_epcot", park: "EPCOT", date: "2026-09-03", status: "planned", source: "explicit_user" }],
      diningPlans: [{ id: "dining_2026_09_03_dinner_via_napoli", restaurant: "Via Napoli", date: "2026-09-03", mealPeriod: "dinner", targetTime: "18:10", status: "confirmed", source: "explicit_user" }],
      activityPlans: [],
      attentionItems: [{ id: "live_epcot_hours", label: "EPCOT current hours", category: "live_info", status: "open", source: "deterministic_inference" }],
    };

    const result = deserializePixieDraft(serializePixieDraft(state));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.planningWorkspace.lodgingPlans[0]?.status).toBe("selected");
    expect(result.state.planningWorkspace.diningPlans[0]).toMatchObject({ restaurant: "Via Napoli", status: "confirmed" });
    expect(result.state.planningWorkspace.attentionItems[0]?.category).toBe("live_info");
  });

  it("preserves enriched lodging segment estimates through draft persistence", () => {
    const state = createEmptyPixieTripState("2026-08-13T12:00:00.000Z");
    state.dates = { arrivalDate: "2026-09-01", departureDate: "2026-09-06", numberOfNights: 5 };
    state.party = { ...state.party, adults: 2, children: 1 };
    state.planningWorkspace = {
      ...state.planningWorkspace,
      lodgingPlans: [
        {
          id: "lodging_blt_2026_09_01",
          resort: "Bay Lake Tower",
          checkIn: "2026-09-01",
          checkOut: "2026-09-02",
          startDate: "2026-09-01",
          endDate: "2026-09-02",
          status: "selected",
          source: "explicit_user",
          roomType: "Deluxe Studio",
          numberOfNights: 1,
          estimatedPoints: 20,
          pointsEstimateStatus: "estimate",
          estimatedRentalCostCents: 46000,
          rentalEstimateStatus: "estimate",
          estimateNotes: "Planning estimate only; not availability or a booking.",
        },
      ],
    };

    const result = deserializePixieDraft(serializePixieDraft(state));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.planningWorkspace.lodgingPlans[0]).toMatchObject({
      resort: "Bay Lake Tower",
      checkIn: "2026-09-01",
      checkOut: "2026-09-02",
      roomType: "Deluxe Studio",
      estimatedPoints: 20,
      estimatedRentalCostCents: 46000,
      pointsEstimateStatus: "estimate",
      rentalEstimateStatus: "estimate",
    });
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

  it("migrates legacy zero-adult two-year-old drafts without preserving invented totals", () => {
    const state = createEmptyPixieTripState("2026-07-10T12:00:00.000Z");
    const result = migratePixieDraft({
      draftVersion: PIXIE_LOCAL_DRAFT_VERSION,
      savedAt: "2026-07-10T13:00:00.000Z",
      state: {
        ...state,
        party: {
          adults: 0,
          children: 1,
          totalPartySize: 1,
          adultCount: 0,
          childCount: 1,
          ageGroupSummary: { infant: 1, preschooler: 0, child: 0, teen: 0, adult: 0, unknown: 0 },
          travellers: [{ id: "traveller_child", category: "child", age: 2, ageGroup: "infant" }],
        },
      },
      recentMessages: [],
    });

    expect(result.ok).toBe(true);
    expect(result.state.party.adultCount).toBeUndefined();
    expect(result.state.party.totalPartySize).toBeUndefined();
    expect(result.state.party.childCount).toBe(1);
    expect(result.state.party.travellers[0]?.ageGroup).toBe("preschooler");
    expect(result.state.party.ageGroupSummary?.infant).toBe(0);
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

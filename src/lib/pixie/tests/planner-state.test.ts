import { describe, expect, it } from "vitest";

import { PIXIE_SCHEMA_VERSION } from "@/lib/pixie/constants";
import {
  applyPixieTripPatch,
  calculateDateOnlyNights,
  createEmptyPixieTripState,
  deriveAgeGroup,
  evaluatePixiePlanningStage,
  normalizePixieTripState,
} from "@/lib/pixie/planner-state";

describe("Pixie planner state", () => {
  it("calculates date-only nights without timezone drift", () => {
    expect(calculateDateOnlyNights("2027-03-13", "2027-03-15")).toBe(2);
    expect(calculateDateOnlyNights("2027-11-06", "2027-11-08")).toBe(2);
  });

  it("returns undefined nights for partial dates", () => {
    expect(calculateDateOnlyNights("2027-03-13")).toBeUndefined();
    expect(calculateDateOnlyNights(undefined, "2027-03-15")).toBeUndefined();
  });

  it("normalizes strings, duplicate preferences, timestamps, and derived nights", () => {
    const state = normalizePixieTripState(
      {
        ...createEmptyPixieTripState("2026-07-10T12:00:00.000Z"),
        tripName: "  Spring Break  ",
        dates: { arrivalDate: "2027-04-01", departureDate: "2027-04-06" },
        preferences: {
          resortPriorities: [" pool ", "Pool", " easy transportation "],
          preferredResorts: [" Riviera Resort ", "rIViera Resort"],
        },
      },
      { now: "2026-07-10T13:00:00.000Z" },
    );

    expect(state.tripName).toBe("Spring Break");
    expect(state.dates.numberOfNights).toBe(5);
    expect(state.preferences.resortPriorities).toEqual(["pool", "easy transportation"]);
    expect(state.preferences.preferredResorts).toEqual(["Riviera Resort"]);
    expect(state.metadata.updatedAt).toBe("2026-07-10T13:00:00.000Z");
  });

  it("normalizes empty preference arrays consistently", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState(),
      preferences: { resortPriorities: ["   "], attractionInterests: [] },
    });

    expect(state.preferences.resortPriorities).toEqual([]);
    expect(state.preferences.attractionInterests).toEqual([]);
  });

  it("adds, updates, and removes travellers with stable IDs", () => {
    const base = createEmptyPixieTripState("2026-07-10T12:00:00.000Z");
    const added = applyPixieTripPatch(
      base,
      {
        party: {
          travellerOperations: [
            {
              op: "addTraveller",
              traveller: { id: "traveller_parent", label: " Parent ", category: "adult", interests: ["Pools", "pools"] },
            },
          ],
        },
      },
      { now: "2026-07-10T13:00:00.000Z" },
    );

    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.state.party.travellers[0]?.id).toBe("traveller_parent");
    expect(added.state.party.travellers[0]?.label).toBe("Parent");
    expect(added.state.party.travellers[0]?.interests).toEqual(["Pools"]);
    expect(added.state.party.adultCount).toBe(1);

    const updated = applyPixieTripPatch(added.state, {
      party: {
        travellerOperations: [{ op: "updateTraveller", id: "traveller_parent", changes: { age: 41, category: "adult" } }],
      },
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.state.party.travellers[0]?.ageGroup).toBe("adult");

    const removed = applyPixieTripPatch(updated.state, {
      party: { travellerOperations: [{ op: "removeTraveller", id: "traveller_parent" }] },
    });

    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.state.party.travellers).toEqual([]);
  });

  it("generates a stable local traveller ID when one is not provided", () => {
    const result = applyPixieTripPatch(createEmptyPixieTripState(), {
      party: { travellerOperations: [{ op: "addTraveller", traveller: { label: "Kid", category: "child" } }] },
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.party.travellers[0]?.id).toMatch(/^traveller_/);
  });

  it("fails safely for unknown traveller updates and duplicate traveller IDs", () => {
    const base = createEmptyPixieTripState();

    const missing = applyPixieTripPatch(base, {
      party: { travellerOperations: [{ op: "updateTraveller", id: "traveller_missing", changes: { age: 8 } }] },
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors[0]?.code).toBe("TRAVELLER_NOT_FOUND");

    const withTraveller = applyPixieTripPatch(base, {
      party: { travellerOperations: [{ op: "addTraveller", traveller: { id: "traveller_1", category: "child" } }] },
    });
    expect(withTraveller.ok).toBe(true);
    if (!withTraveller.ok) return;

    const duplicate = applyPixieTripPatch(withTraveller.state, {
      party: { travellerOperations: [{ op: "addTraveller", traveller: { id: "traveller_1", category: "adult" } }] },
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.errors[0]?.code).toBe("DUPLICATE_TRAVELLER_ID");
  });

  it("fails safely for unknown traveller removal", () => {
    const result = applyPixieTripPatch(createEmptyPixieTripState(), {
      party: { travellerOperations: [{ op: "removeTraveller", id: "traveller_missing" }] },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.code).toBe("TRAVELLER_NOT_FOUND");
  });

  it("reconciles aggregate counts with individual travellers and derives age groups", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState(),
      party: {
        adults: 1,
        children: 1,
        travellers: [
          { id: "traveller_adult", category: "adult", age: 38 },
          { id: "traveller_child", category: "child", age: 7 },
          { id: "traveller_teen", category: "child", age: 15 },
        ],
      },
    });

    expect(state.party.adultCount).toBe(1);
    expect(state.party.childCount).toBe(2);
    expect(state.party.totalPartySize).toBe(3);
    expect(state.party.ageGroupSummary?.adult).toBe(1);
    expect(state.party.ageGroupSummary?.child).toBe(1);
    expect(state.party.ageGroupSummary?.teen).toBe(1);
    expect(deriveAgeGroup(4, "child")).toBe("preschooler");
  });

  it("preserves unrelated state, recomputes derived fields, and protects schema version", () => {
    const base = createEmptyPixieTripState("2026-07-10T12:00:00.000Z");
    const patched = applyPixieTripPatch(
      base,
      {
        tripName: "Family trip",
        dates: { arrivalDate: "2027-05-01", departureDate: "2027-05-08" },
        party: { adults: 2, children: 1 },
      },
      { now: "2026-07-10T14:00:00.000Z" },
    );

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    expect(patched.state.schemaVersion).toBe(PIXIE_SCHEMA_VERSION);
    expect(patched.state.tripName).toBe("Family trip");
    expect(patched.state.dates.numberOfNights).toBe(7);
    expect(patched.state.party.totalPartySize).toBe(3);
    expect(patched.state.budget.budgetType).toBe("unknown");
    expect(patched.state.metadata.updatedAt).toBe("2026-07-10T14:00:00.000Z");
  });

  it("updates selected options without touching generated state", () => {
    const base = createEmptyPixieTripState();
    const patched = applyPixieTripPatch(base, {
      selectedOptions: { selectedResortSlug: "riviera-resort", selectedRoomType: "studio" },
    });

    expect(patched.ok).toBe(true);
    if (patched.ok) {
      expect(patched.state.selectedOptions.selectedResortSlug).toBe("riviera-resort");
      expect(patched.state.generated.resortRecommendations).toEqual([]);
    }
  });

  it("retains working itinerary, traveler-reported availability, DVC points, and active risk state", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState("2026-08-10T12:00:00.000Z"), {
      dvcContext: {
        lodgingContext: "dvc_points",
        useYear: "September",
        currentUseYearPoints: { points: 9, source: "user_provided" },
        nextUseYearPoints: { points: 220, source: "user_provided" },
        contracts: [{ id: "  bwv_direct  ", homeResort: " BoardWalk Villas ", acquisitionType: "direct", points: 150 }],
        pointLots: [{ id: " banked_2026 ", state: "banked", points: 12, expirationDate: "2027-08-31", notes: "  Use before current points.  " }],
        borrowingContemplated: true,
        planningRisks: ["Unknown account-specific point allocation should not be invented."],
      },
      planningWorkspace: {
        workingItinerary: [
          {
            date: "2026-09-01",
            resort: "Saratoga Springs",
            roomType: "Studio",
            points: 9,
            status: "planned",
            alternatives: [{ resort: "Bay Lake Tower", roomType: "Studio", points: 16, status: "waitlist_candidate" }],
          },
          { date: "2026-09-05", status: "unresolved" },
        ],
        availabilityObservations: [
          { date: "2026-09-01", resort: "Bay Lake Tower", roomType: "Studio", points: 16, status: "reported_waitlist", source: "traveler_reported" },
        ],
        activeDecisions: [
          {
            id: "sept_1_blt_waitlist",
            label: "Sept 1 BLT waitlist",
            currentSecureOption: "Saratoga Springs",
            potentialBenefit: "Walk to Magic Kingdom party.",
            risk: "Modification within 30-day window.",
            status: "needs_decision",
          },
        ],
      },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    expect(patched.state.dvcContext.useYear).toBe("September");
    expect(patched.state.dvcContext.currentUseYearPoints?.points).toBe(9);
    expect(patched.state.dvcContext.nextUseYearPoints?.points).toBe(220);
    expect(patched.state.dvcContext.contracts[0]).toMatchObject({ id: "bwv_direct", homeResort: "BoardWalk Villas" });
    expect(patched.state.dvcContext.pointLots[0]).toMatchObject({ id: "banked_2026", notes: "Use before current points." });
    expect(patched.state.dvcContext.borrowedPoints).toBeUndefined();
    expect(patched.state.planningWorkspace.workingItinerary).toHaveLength(2);
    expect(patched.state.planningWorkspace.workingItinerary[1]?.status).toBe("unresolved");
    expect(patched.state.planningWorkspace.availabilityObservations[0]?.source).toBe("traveler_reported");
    expect(patched.state.planningWorkspace.availabilityObservations[0]?.source).not.toBe("HannaDVC_verified");
    expect(patched.state.planningWorkspace.activeDecisions[0]?.risk).toBe("Modification within 30-day window.");
  });

  it("merges repeated nightly workspace patches by date instead of duplicating nights", () => {
    const first = applyPixieTripPatch(createEmptyPixieTripState(), {
      planningWorkspace: { workingItinerary: [{ date: "2026-09-03", resort: "BoardWalk Villas", points: 10, status: "planned" }] },
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = applyPixieTripPatch(first.state, {
      planningWorkspace: { workingItinerary: [{ date: "2026-09-03", resort: "BoardWalk Villas", roomType: "Studio", points: 10, status: "planned" }] },
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.state.planningWorkspace.workingItinerary).toHaveLength(1);
    expect(second.state.planningWorkspace.workingItinerary[0]?.roomType).toBe("Studio");
  });

  it("normalizes budget currency only when an amount is supplied", () => {
    const noAmount = normalizePixieTripState(createEmptyPixieTripState());
    const withAmount = normalizePixieTripState({
      ...createEmptyPixieTripState(),
      budget: { amountCents: 125000, budgetType: "nightly" },
    });

    expect(noAmount.budget.currency).toBeUndefined();
    expect(withAmount.budget.currency).toBe("USD");
  });

  it("returns typed errors for invalid current state and invalid patches", () => {
    const invalidCurrent = applyPixieTripPatch({ schemaVersion: 999 }, { tripName: "Nope" });
    expect(invalidCurrent.ok).toBe(false);
    if (!invalidCurrent.ok) expect(invalidCurrent.errors[0]?.code).toBe("INVALID_CURRENT_STATE");

    const invalidPatch = applyPixieTripPatch(createEmptyPixieTripState(), { dates: { numberOfNights: 9 } });
    expect(invalidPatch.ok).toBe(false);
    if (!invalidPatch.ok) expect(invalidPatch.errors[0]?.code).toBe("INVALID_PATCH");
  });

  it("returns normalization errors after otherwise valid patches", () => {
    const result = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { arrivalDate: "2027-01-10", departureDate: "2027-01-09" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.code).toBe("NORMALIZATION_FAILED");
  });

  it("derives planning stages from state completeness", () => {
    const base = createEmptyPixieTripState();
    expect(evaluatePixiePlanningStage(base)).toBe("new");

    const result = applyPixieTripPatch(base, {
      dates: { arrivalDate: "2027-06-01", departureDate: "2027-06-06" },
      party: { adults: 2, children: 2 },
      preferences: { resortPriorities: ["pool"], parkPriorities: ["Magic Kingdom"], vacationPace: "balanced", parkDayIntention: true },
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.planningStage).toBe("plan_ready");
  });

  it("derives dates_defined before party_defined when only dates are usable", () => {
    const result = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { flexibleDates: true, dateNotes: "Sometime in February" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.planningStage).toBe("dates_defined");
  });
});

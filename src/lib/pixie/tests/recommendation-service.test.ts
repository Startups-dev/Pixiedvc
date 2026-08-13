import { describe, expect, it } from "vitest";

import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";
import { recommendPixieResorts } from "@/lib/pixie/resorts/recommendation-service";

function trip(input: Record<string, unknown>) {
  return normalizePixieTripState({ ...createEmptyPixieTripState("2026-07-10T12:00:00.000Z"), ...input });
}

describe("Pixie resort recommendation service", () => {
  it("incomplete trip returns readiness warning", () => {
    const result = recommendPixieResorts(createEmptyPixieTripState(), { now: "2026-07-10T12:00:00.000Z" });
    expect(result.warnings).toContain("Trip is not ready for strong resort recommendations yet.");
    expect(result.recommendationReadiness.readyForResortRecommendations).toBe(false);
  });

  it("complete family trip returns ranked recommendations", () => {
    const result = recommendPixieResorts(
      trip({
        dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
        party: { adults: 2, children: 2 },
        preferences: { resortPriorities: ["easy transportation"], parkPriorities: ["Magic Kingdom"], transportationPreferences: ["monorail"] },
      }),
    );
    expect(result.recommendations).toHaveLength(3);
    expect(result.recommendations[0].rank).toBe(1);
    expect(result.recommendations[0].reasonCodes.length).toBeGreaterThan(0);
  });

  it("large-party trip returns appropriate rooms", () => {
    const result = recommendPixieResorts(
      trip({
        dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
        party: { adults: 6, children: 4 },
        preferences: { resortPriorities: ["space"] },
      }),
    );
    expect(result.recommendations.every((rec) => rec.recommendedRoomType.maximumCapacity >= 10)).toBe(true);
  });

  it("low accommodation budget affects recommendations conservatively", () => {
    const result = recommendPixieResorts(
      trip({
        dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
        party: { adults: 2 },
        budget: { amountCents: 10000, currency: "USD", budgetType: "accommodation_only" },
        preferences: { resortPriorities: ["value"] },
      }),
    );
    expect(result.recommendations.some((rec) => rec.reasonCodes.includes("likely_over_budget"))).toBe(true);
  });

  it("high-priority EPCOT trip favors verified nearby options", () => {
    const result = recommendPixieResorts(
      trip({
        dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
        party: { adults: 2 },
        preferences: { resortPriorities: ["walkable"], parkPriorities: ["EPCOT"] },
      }),
    );
    expect(["bcv", "bwv", "rva"]).toContain(result.recommendations[0].resortId);
  });

  it("Magic Kingdom priority affects ranking", () => {
    const result = recommendPixieResorts(
      trip({
        dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
        party: { adults: 2 },
        preferences: { parkPriorities: ["Magic Kingdom"], transportationPreferences: ["monorail"], resortPriorities: ["easy"] },
      }),
    );
    expect(["blt", "vgf", "pvb"]).toContain(result.recommendations[0].resortId);
  });

  it("late Magic Kingdom party return convenience ranks Bay Lake Tower above Animal Kingdom Villas", () => {
    const result = recommendPixieResorts(
      trip({
        dates: { arrivalDate: "2026-09-01", departureDate: "2026-09-06" },
        party: { adults: 2, children: 1, travellers: [{ id: "daughter", category: "child", age: 2 }] },
        preferences: {
          parkPriorities: ["Magic Kingdom"],
          resortPriorities: ["price sensitivity low", "dominant Magic Kingdom return convenience", "walking access after Magic Kingdom party"],
          transportationPreferences: ["walk"],
        },
      }),
    );

    expect(result.recommendations[0].resortId).toBe("blt");
    expect(result.recommendations[0].reasonCodes).toContain("dominant_mk_return_convenience");
    expect(result.recommendations.map((recommendation) => recommendation.resortId)).not.toHaveProperty("0", "akv");
  });

  it("Animal Kingdom Villas can still rank strongly for Animal Kingdom and savanna priorities", () => {
    const result = recommendPixieResorts(
      trip({
        dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
        party: { adults: 2, children: 1 },
        preferences: { parkPriorities: ["Animal Kingdom"], preferredResorts: ["Animal Kingdom Villas"], resortPriorities: ["savanna", "animals"], vacationPace: "relaxed" },
      }),
    );

    expect(result.recommendations[0].resortId).toBe("akv");
  });

  it("relaxed trip with pool priority changes scoring", () => {
    const result = recommendPixieResorts(
      trip({
        dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
        party: { adults: 2 },
        preferences: { resortPriorities: ["pool"], vacationPace: "relaxed", poolImportance: "high" },
      }),
    );
    expect(result.recommendations[0].reasonCodes.some((code) => code === "strong_pool_match" || code === "relaxed_pace_match")).toBe(true);
  });

  it("user exclusions are respected", () => {
    const result = recommendPixieResorts(
      trip({
        dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
        party: { adults: 2 },
        preferences: { resortPriorities: ["monorail"], excludedResorts: ["Bay Lake Tower"] },
      }),
    );
    expect(result.recommendations.map((rec) => rec.resortId)).not.toContain("blt");
    expect(result.excludedResorts.some((resort) => resort.code === "user_excluded")).toBe(true);
  });

  it("top result contains reason codes and tradeoffs", () => {
    const result = recommendPixieResorts(trip({ dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" }, party: { adults: 2 }, preferences: { resortPriorities: ["quiet"] } }));
    expect(result.recommendations[0].reasonCodes.length).toBeGreaterThan(0);
    expect(result.recommendations[0].tradeoffs.length).toBeGreaterThan(0);
  });

  it("no result contains unsupported trusted pricing as confirmed", () => {
    const result = recommendPixieResorts(trip({ dates: { arrivalDate: "2028-09-07", departureDate: "2028-09-12" }, party: { adults: 2 }, preferences: { resortPriorities: ["quiet"] } }));
    expect(result.recommendations.every((rec) => rec.pricingStatus !== "estimated")).toBe(true);
  });

  it("version metadata appears in response", () => {
    const result = recommendPixieResorts(trip({ dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" }, party: { adults: 2 }, preferences: { resortPriorities: ["quiet"] } }));
    expect(result.scoringVersion).toBeTruthy();
    expect(result.catalogVersion).toBeTruthy();
  });

  it("recommendation IDs are stable for the same inputs", () => {
    const state = trip({ dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" }, party: { adults: 2 }, preferences: { resortPriorities: ["quiet"] } });
    const first = recommendPixieResorts(state, { now: "2026-07-10T12:00:00.000Z" });
    const second = recommendPixieResorts(state, { now: "2026-07-10T12:00:00.000Z" });
    expect(second.recommendations.map((rec) => rec.recommendationId)).toEqual(first.recommendations.map((rec) => rec.recommendationId));
  });

  it("repeated calls return identical rankings", () => {
    const state = trip({ dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" }, party: { adults: 2 }, preferences: { resortPriorities: ["quiet"] } });
    expect(recommendPixieResorts(state).recommendations.map((rec) => rec.resortId)).toEqual(recommendPixieResorts(state).recommendations.map((rec) => rec.resortId));
  });
});

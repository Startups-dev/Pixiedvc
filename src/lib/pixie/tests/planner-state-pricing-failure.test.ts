import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pixie/pricing/guest-price-adapter", () => ({
  estimateGuestAccommodationPrice: () => {
    throw new Error("pricing adapter unavailable");
  },
}));

describe("Pixie planner lodging estimate failure handling", () => {
  it("keeps split-stay lodging state when the rental pricing adapter throws", async () => {
    const { createEmptyPixieTripState, normalizePixieTripState } = await import("@/lib/pixie/planner-state");
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      party: {
        adults: 2,
        children: 1,
        travellers: [{ id: "daughter", category: "child", age: 2 }],
      },
      planningWorkspace: {
        lodgingPlans: [
          {
            id: "lodging_bay_lake_tower_2026_09_01",
            resort: "Bay Lake Tower",
            startDate: "2026-09-01",
            endDate: "2026-09-02",
            status: "recommended",
            source: "model_recommendation",
          },
        ],
      },
    });

    expect(state.planningWorkspace.lodgingPlans[0]).toMatchObject({
      resort: "Bay Lake Tower",
      checkIn: "2026-09-01",
      checkOut: "2026-09-02",
      roomType: "Deluxe Studio",
      pointsEstimateStatus: "estimate",
      rentalEstimateStatus: "not_requested",
    });
    expect(state.planningWorkspace.lodgingPlans[0]?.estimatedPoints).toBeUndefined();
    expect(state.planningWorkspace.lodgingPlans[0]?.estimatedPointsLow).toBeGreaterThan(0);
    expect(state.planningWorkspace.lodgingPlans[0]?.estimatedPointsHigh).toBeGreaterThanOrEqual(state.planningWorkspace.lodgingPlans[0]?.estimatedPointsLow ?? 0);
    expect(state.planningWorkspace.lodgingPlans[0]?.estimatedRentalCostCents).toBeUndefined();
  });
});

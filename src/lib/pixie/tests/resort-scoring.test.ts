import { describe, expect, it } from "vitest";

import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";
import { estimateGuestAccommodationPrice } from "@/lib/pixie/pricing/guest-price-adapter";
import { getPixieResortById } from "@/lib/pixie/resorts/identifiers";
import { selectSmallestEligibleRoomType } from "@/lib/pixie/resorts/room-types";
import { evaluateBudgetFit, scorePixieResort } from "@/lib/pixie/resorts/scoring";

function state(input: Record<string, unknown>) {
  return normalizePixieTripState({ ...createEmptyPixieTripState(), ...input });
}

describe("Pixie resort scoring", () => {
  it("preferred resort receives expected bonus", () => {
    const trip = state({ party: { adults: 2 }, preferences: { preferredResorts: ["riviera-resort"], resortPriorities: ["Skyliner"] } });
    const resort = getPixieResortById("rva")!;
    const room = selectSmallestEligibleRoomType(resort, trip.party)!;
    expect(scorePixieResort({ resort, recommendedRoomType: room, state: trip, guestPrice: null }).reasonCodes).toContain("preferred_resort");
  });

  it("priority park proximity affects ranking", () => {
    const trip = state({ party: { adults: 2 }, preferences: { parkPriorities: ["EPCOT"], resortPriorities: ["walkable"] } });
    const bcv = getPixieResortById("bcv")!;
    const okw = getPixieResortById("okw")!;
    const bcvScore = scorePixieResort({ resort: bcv, recommendedRoomType: selectSmallestEligibleRoomType(bcv, trip.party)!, state: trip, guestPrice: null }).score;
    const okwScore = scorePixieResort({ resort: okw, recommendedRoomType: selectSmallestEligibleRoomType(okw, trip.party)!, state: trip, guestPrice: null }).score;
    expect(bcvScore).toBeGreaterThan(okwScore);
  });

  it("transportation preference affects ranking", () => {
    const trip = state({ party: { adults: 2 }, preferences: { transportationPreferences: ["monorail"], resortPriorities: ["easy transportation"] } });
    const blt = getPixieResortById("blt")!;
    const akv = getPixieResortById("akv")!;
    expect(scorePixieResort({ resort: blt, recommendedRoomType: selectSmallestEligibleRoomType(blt, trip.party)!, state: trip, guestPrice: null }).score).toBeGreaterThan(
      scorePixieResort({ resort: akv, recommendedRoomType: selectSmallestEligibleRoomType(akv, trip.party)!, state: trip, guestPrice: null }).score,
    );
  });

  it("kitchen preference affects room and resort score", () => {
    const trip = state({ party: { adults: 5 }, preferences: { kitchenImportance: "high", roomPreferences: ["full kitchen"] } });
    const resort = getPixieResortById("blt")!;
    const room = selectSmallestEligibleRoomType(resort, trip.party)!;
    const score = scorePixieResort({ resort, recommendedRoomType: room, state: trip, guestPrice: null });
    expect(room.kitchenLevel).toBe("full");
    expect(score.reasonCodes).toContain("kitchen_match");
  });

  it("pool and walking preferences produce deterministic reasons", () => {
    const trip = state({ party: { adults: 2 }, preferences: { poolImportance: "high", walkingSensitivity: "high" }, accessibility: { mobilityConsiderations: "limit walking" } });
    const resort = getPixieResortById("bcv")!;
    const score = scorePixieResort({ resort, recommendedRoomType: selectSmallestEligibleRoomType(resort, trip.party)!, state: trip, guestPrice: null });
    expect(score.reasonCodes).toContain("strong_pool_match");
  });

  it("missing preferences remain neutral", () => {
    const trip = state({ party: { adults: 2 } });
    const resort = getPixieResortById("okw")!;
    const score = scorePixieResort({ resort, recommendedRoomType: selectSmallestEligibleRoomType(resort, trip.party)!, state: trip, guestPrice: null });
    expect(score.reasonCodes).toContain("incomplete_preferences");
    expect(score.score).toBeGreaterThan(0);
  });

  it("budget fit preserves integer cents and labels over-budget conservatively", () => {
    const trip = state({ dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-09" }, party: { adults: 2 }, budget: { amountCents: 10000, currency: "USD", budgetType: "accommodation_only" } });
    const price = estimateGuestAccommodationPrice({ pricingContext: "custom_request_estimate", resortId: "blt", points: 100, arrivalDate: "2027-09-07", bookingDate: "2027-01-01" });
    expect(price.supported && price.pricingContext === "custom_request_estimate" && price.estimatedTotalCents).toBe(240000);
    expect(evaluateBudgetFit(trip, price)).toBe("likely_over_budget");
  });

  it("total-trip budget is not treated as accommodation budget", () => {
    const trip = state({ party: { adults: 2 }, budget: { amountCents: 500000, currency: "USD", budgetType: "total_trip" } });
    const price = estimateGuestAccommodationPrice({ pricingContext: "custom_request_estimate", resortId: "okw", points: 100, arrivalDate: "2027-09-07" });
    expect(evaluateBudgetFit(trip, price)).toBe("cannot_evaluate");
  });
});

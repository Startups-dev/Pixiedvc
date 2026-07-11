import { describe, expect, it } from "vitest";

import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";
import { PIXIE_UNSUPPORTED_WDW_RESORTS } from "@/lib/pixie/resorts/catalog";
import { evaluatePixieResortEligibility } from "@/lib/pixie/resorts/eligibility";
import { getPixieResortById } from "@/lib/pixie/resorts/identifiers";

describe("Pixie resort eligibility", () => {
  it("explicitly excluded resort never appears", () => {
    const state = normalizePixieTripState({ ...createEmptyPixieTripState(), party: { adults: 2 }, preferences: { excludedResorts: ["Bay Lake Tower"] } });
    const eligibility = evaluatePixieResortEligibility(getPixieResortById("blt")!, state);
    expect(eligibility).toMatchObject({ eligible: false, exclusion: { code: "user_excluded" } });
  });

  it("preferred resort does not bypass capacity", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState(),
      party: { adults: 12 },
      preferences: { preferredResorts: ["Beach Club Villas"] },
    });
    expect(evaluatePixieResortEligibility(getPixieResortById("bcv")!, state)).toMatchObject({
      eligible: false,
      exclusion: { code: "insufficient_room_capacity" },
    });
  });

  it("large party without supported room capacity is hard excluded", () => {
    const state = normalizePixieTripState({ ...createEmptyPixieTripState(), party: { adults: 10 } });
    const eligibility = evaluatePixieResortEligibility(getPixieResortById("bcv")!, state);
    expect(eligibility).toMatchObject({ eligible: false, exclusion: { code: "insufficient_room_capacity" } });
  });

  it("missing soft preferences do not exclude resorts", () => {
    const state = normalizePixieTripState({ ...createEmptyPixieTripState(), party: { adults: 2 } });
    const eligibility = evaluatePixieResortEligibility(getPixieResortById("okw")!, state);
    expect(eligibility.eligible).toBe(true);
  });

  it("non-WDW properties are not present in eligibility catalog", () => {
    expect(getPixieResortById("aulani")).toBeNull();
  });

  it("unsupported WDW properties are listed as hard exclusions outside catalog", () => {
    expect(PIXIE_UNSUPPORTED_WDW_RESORTS[0]?.slug).toBe("fort-wilderness-cabins");
  });
});

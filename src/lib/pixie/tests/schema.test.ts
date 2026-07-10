import { describe, expect, it } from "vitest";

import { PIXIE_LIMITS } from "@/lib/pixie/constants";
import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";
import { pixieTripPatchSchema, pixieTripStateSchema } from "@/lib/pixie/schema";

describe("Pixie planner schemas", () => {
  it("accepts an empty new trip state", () => {
    const state = createEmptyPixieTripState("2026-07-10T12:00:00.000Z");

    expect(pixieTripStateSchema.safeParse(state).success).toBe(true);
    expect(state.destination).toBe("walt_disney_world");
    expect(state.planningStage).toBe("new");
  });

  it("accepts partial dates, party, and preferences while planning", () => {
    const state = createEmptyPixieTripState();

    expect(pixieTripStateSchema.safeParse({ ...state, dates: { arrivalDate: "2027-01-10" } }).success).toBe(true);
    expect(pixieTripStateSchema.safeParse({ ...state, party: { adults: 2 } }).success).toBe(true);
    expect(
      pixieTripStateSchema.safeParse({
        ...state,
        preferences: { resortPriorities: ["pool"], vacationPace: "balanced" },
      }).success,
    ).toBe(true);
  });

  it("accepts a valid flexible date window", () => {
    const base = createEmptyPixieTripState();

    expect(
      pixieTripStateSchema.safeParse({
        ...base,
        dates: { flexibleDates: true, arrivalDate: "2027-01-10", flexibilityDaysBefore: 3, flexibilityDaysAfter: 4 },
      }).success,
    ).toBe(true);
  });

  it("rejects invalid calendar dates even when formatted as date-only strings", () => {
    const base = createEmptyPixieTripState();

    expect(() =>
      normalizePixieTripState({ ...base, dates: { arrivalDate: "2027-02-30", departureDate: "2027-03-02" } }),
    ).toThrow("Departure date must be after arrival date");
  });

  it("rejects same-day and reversed trips during trusted normalization", () => {
    const base = createEmptyPixieTripState();

    expect(() =>
      normalizePixieTripState({ ...base, dates: { arrivalDate: "2027-01-10", departureDate: "2027-01-10" } }),
    ).toThrow("Departure date must be after arrival date");
    expect(() =>
      normalizePixieTripState({ ...base, dates: { arrivalDate: "2027-01-11", departureDate: "2027-01-10" } }),
    ).toThrow("Departure date must be after arrival date");
  });

  it("rejects excessive trip duration and flexible-date windows", () => {
    const base = createEmptyPixieTripState();

    expect(() =>
      normalizePixieTripState({ ...base, dates: { arrivalDate: "2027-01-01", departureDate: "2027-02-15" } }),
    ).toThrow(`Trip duration cannot exceed ${PIXIE_LIMITS.maxTripDurationNights} nights`);
    expect(
      pixieTripStateSchema.safeParse({
        ...base,
        dates: { flexibleDates: true, flexibilityDaysBefore: PIXIE_LIMITS.maxFlexibleDateWindowDays + 1 },
      }).success,
    ).toBe(false);
  });

  it("rejects negative party and budget values", () => {
    const base = createEmptyPixieTripState();

    expect(pixieTripStateSchema.safeParse({ ...base, party: { adults: -1 } }).success).toBe(false);
    expect(pixieTripStateSchema.safeParse({ ...base, party: { children: -1 } }).success).toBe(false);
    expect(pixieTripStateSchema.safeParse({ ...base, budget: { amountCents: -1 } }).success).toBe(false);
  });

  it("accepts zero budget as an intentional preference", () => {
    const base = createEmptyPixieTripState();

    expect(pixieTripStateSchema.safeParse({ ...base, budget: { amountCents: 0, currency: "USD", budgetType: "unknown" } }).success).toBe(
      true,
    );
  });

  it("trims empty optional strings to undefined", () => {
    const parsed = pixieTripStateSchema.parse({ ...createEmptyPixieTripState(), tripName: "   " });

    expect(parsed.tripName).toBeUndefined();
  });

  it("enforces party size and traveller limits", () => {
    const base = createEmptyPixieTripState();

    expect(
      pixieTripStateSchema.safeParse({
        ...base,
        party: { adults: PIXIE_LIMITS.maxPartySize + 1 },
      }).success,
    ).toBe(false);
    expect(
      pixieTripStateSchema.safeParse({
        ...base,
        party: {
          travellers: Array.from({ length: PIXIE_LIMITS.maxTravellers + 1 }, (_, index) => ({
            id: `traveller_${index}`,
            category: "adult",
          })),
        },
      }).success,
    ).toBe(false);
  });

  it("keeps accommodation-only budget distinct from total-trip budget and uses integer cents", () => {
    const base = createEmptyPixieTripState();
    const accommodation = pixieTripStateSchema.parse({
      ...base,
      budget: { amountCents: 350000, currency: "USD", budgetType: "accommodation_only" },
    });

    expect(accommodation.budget.budgetType).toBe("accommodation_only");
    expect(pixieTripStateSchema.safeParse({ ...base, budget: { amountCents: 3500.5, currency: "USD" } }).success).toBe(false);
    expect(pixieTripStateSchema.safeParse({ ...base, budget: { amountCents: 350000, currency: "EUR" } }).success).toBe(false);
  });

  it("rejects unknown, generated, and schema-version patch fields", () => {
    expect(pixieTripPatchSchema.safeParse({ unknown: true }).success).toBe(false);
    expect(pixieTripPatchSchema.safeParse({ generated: { completeness: 100 } }).success).toBe(false);
    expect(pixieTripPatchSchema.safeParse({ schemaVersion: 2 }).success).toBe(false);
  });

  it("rejects calculated party fields in patches", () => {
    expect(pixieTripPatchSchema.safeParse({ party: { totalPartySize: 4 } }).success).toBe(false);
    expect(pixieTripPatchSchema.safeParse({ party: { adultCount: 2 } }).success).toBe(false);
    expect(pixieTripPatchSchema.safeParse({ party: { ageGroupSummary: { adult: 2 } } }).success).toBe(false);
  });

  it("rejects direct traveller-array replacement in patches", () => {
    expect(
      pixieTripPatchSchema.safeParse({
        party: { travellers: [{ id: "traveller_1", category: "adult" }] },
      }).success,
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { applyPixieTripPatch, createEmptyPixieTripState } from "@/lib/pixie/planner-state";

describe("Pixie completeness evaluator", () => {
  it("returns a low, deterministic score for an empty state", () => {
    const result = evaluatePixieCompleteness(createEmptyPixieTripState());

    expect(result.score).toBe(10);
    expect(result.planningStage).toBe("new");
    expect(result.missingRequired).toEqual(["ask_dates", "ask_party", "ask_trip_priorities"]);
    expect(result.suggestedNextQuestionKey).toBe("ask_dates");
  });

  it("moves forward when dates and party are known", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { arrivalDate: "2027-07-01", departureDate: "2027-07-05" },
      party: { adults: 2, children: 1 },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    const result = evaluatePixieCompleteness(patched.state);
    expect(result.planningStage).toBe("party_defined");
    expect(result.readyForReadyStayMatching).toBe(true);
    expect(result.readyForResortRecommendations).toBe(false);
  });

  it("does not treat date-only progress as party readiness", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { arrivalDate: "2027-07-01", departureDate: "2027-07-05" },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    const result = evaluatePixieCompleteness(patched.state);
    expect(result.planningStage).toBe("dates_defined");
    expect(result.readyForReadyStayMatching).toBe(false);
    expect(result.suggestedNextQuestionKey).toBe("ask_party");
  });

  it("marks resort recommendations ready only after dates, party, and priorities", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { arrivalDate: "2027-08-01", departureDate: "2027-08-06" },
      party: { adults: 2, children: 2 },
      preferences: { resortPriorities: ["walkable"], favoriteCharactersOrThemes: ["Mickey"] },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    const result = evaluatePixieCompleteness(patched.state);
    expect(result.readyForResortRecommendations).toBe(true);
    expect(result.planningStage).toBe("recommendation_ready");
    expect(result.missingRequired).toEqual([]);
  });

  it("does not mark point estimates ready without resort and room type", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { arrivalDate: "2027-08-01", departureDate: "2027-08-06" },
      party: { adults: 2 },
      preferences: { resortPriorities: ["pool"] },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    expect(evaluatePixieCompleteness(patched.state).readyForPointEstimates).toBe(false);
  });

  it("marks point estimates ready when exact dates, party, resort, and room exist", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { arrivalDate: "2027-08-01", departureDate: "2027-08-06" },
      party: { adults: 2 },
      selectedOptions: { selectedResortSlug: "old-key-west", selectedRoomType: "one-bedroom" },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    expect(evaluatePixieCompleteness(patched.state).readyForPointEstimates).toBe(true);
  });

  it("marks itinerary readiness separately from recommendation readiness", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { arrivalDate: "2027-09-01", departureDate: "2027-09-06" },
      party: { adults: 2 },
      preferences: {
        resortPriorities: ["quiet"],
        parkPriorities: ["EPCOT"],
        vacationPace: "relaxed",
        parkDayIntention: true,
      },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    const result = evaluatePixieCompleteness(patched.state);
    expect(result.readyForItinerary).toBe(true);
    expect(result.readyForResortRecommendations).toBe(true);
    expect(result.planningStage).toBe("plan_ready");
  });

  it("keeps booking draft readiness false without resort and room choice", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { arrivalDate: "2027-10-01", departureDate: "2027-10-06" },
      party: { adults: 2, children: 1 },
      preferences: { resortPriorities: ["monorail"] },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    const result = evaluatePixieCompleteness(patched.state);
    expect(result.readyForBookingDraft).toBe(false);
    expect(result.planningStage).not.toBe("booking_ready");
    expect(result.missingRecommended).toContain("ask_resort_choice");
    expect(result.missingRecommended).toContain("ask_room_type");
  });

  it("uses budget context as recommended information, not a hard requirement", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { arrivalDate: "2027-10-01", departureDate: "2027-10-06" },
      party: { adults: 2 },
      preferences: { resortPriorities: ["monorail"] },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    const result = evaluatePixieCompleteness(patched.state);
    expect(result.readyForResortRecommendations).toBe(true);
    expect(result.missingRecommended).toContain("ask_budget_context");
  });

  it("marks booking draft readiness only for exact dates, party, resort, and room", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { arrivalDate: "2027-11-01", departureDate: "2027-11-06" },
      party: { adults: 2, children: 1 },
      preferences: { resortPriorities: ["monorail"] },
      selectedOptions: { selectedResortSlug: "bay-lake-tower", selectedRoomType: "studio" },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    const result = evaluatePixieCompleteness(patched.state);
    expect(result.readyForBookingDraft).toBe(true);
    expect(result.planningStage).toBe("booking_ready");
    expect(result.warnings).toContain("Booking draft readiness still requires authentication and booking-form guest details later.");
  });

  it("uses flexible dates for Ready Stay matching but not booking draft readiness", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { flexibleDates: true, arrivalDate: "2027-12-01", flexibilityDaysBefore: 3, flexibilityDaysAfter: 5 },
      party: { adults: 2 },
      preferences: { resortPriorities: ["value"] },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    const result = evaluatePixieCompleteness(patched.state);
    expect(result.readyForReadyStayMatching).toBe(true);
    expect(result.readyForBookingDraft).toBe(false);
    expect(result.warnings[0]).toMatch(/Dates are flexible/);
  });

  it("keeps suggested question deterministic when only recommended fields are missing", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { arrivalDate: "2028-01-01", departureDate: "2028-01-06" },
      party: { adults: 2 },
      preferences: { resortPriorities: ["quiet"] },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    expect(evaluatePixieCompleteness(patched.state).suggestedNextQuestionKey).toBe("ask_budget_context");
  });

  it("reduces plan completeness when a working itinerary has unresolved nights and DVC risks", () => {
    const patched = applyPixieTripPatch(createEmptyPixieTripState(), {
      dates: { arrivalDate: "2026-09-01", departureDate: "2026-09-06" },
      party: { adults: 2, children: 1 },
      preferences: { resortPriorities: ["minimize resort changes"], parkPriorities: ["Magic Kingdom"], vacationPace: "balanced", parkDayIntention: true },
      planningWorkspace: {
        workingItinerary: [
          { date: "2026-09-01", resort: "Saratoga Springs", points: 9, status: "planned" },
          { date: "2026-09-05", status: "unresolved" },
        ],
        activeDecisions: [{ id: "dvc_waitlist", label: "BLT waitlist", status: "needs_decision", risk: "Could affect the secure reservation." }],
      },
      dvcContext: { lodgingContext: "dvc_points", planningRisks: ["Unknown point allocation."] },
    });

    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    const result = evaluatePixieCompleteness(patched.state);
    expect(result.score).toBeLessThan(90);
    expect(result.warnings).toContain("1 itinerary night is still unresolved.");
    expect(result.warnings).toContain("Open DVC decisions or risks remain before this plan should be treated as complete.");
  });
});

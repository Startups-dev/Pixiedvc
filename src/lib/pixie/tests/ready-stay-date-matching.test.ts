import { describe, expect, it } from "vitest";

import { evaluateReadyStayDateMatch } from "@/lib/pixie/ready-stays/date-matching";

describe("Ready Stay date matching", () => {
  it("classifies exact arrival and departure as exact_match", () => {
    const result = evaluateReadyStayDateMatch({
      requestedArrival: "2026-10-10",
      requestedDeparture: "2026-10-15",
      listingArrival: "2026-10-10",
      listingDeparture: "2026-10-15",
    });
    expect(result.classification).toBe("exact_match");
    expect(result.satisfiesFullStay).toBe(true);
    expect(result.overlapNights).toBe(5);
  });

  it("classifies listings inside declared flexibility before and after", () => {
    const before = evaluateReadyStayDateMatch({
      requestedArrival: "2026-10-10",
      requestedDeparture: "2026-10-15",
      flexibleDates: true,
      flexibilityDaysBefore: 2,
      flexibilityDaysAfter: 2,
      listingArrival: "2026-10-08",
      listingDeparture: "2026-10-13",
    });
    const after = evaluateReadyStayDateMatch({
      requestedArrival: "2026-10-10",
      requestedDeparture: "2026-10-15",
      flexibleDates: true,
      flexibilityDaysBefore: 2,
      flexibilityDaysAfter: 2,
      listingArrival: "2026-10-12",
      listingDeparture: "2026-10-17",
    });
    expect(before.classification).toBe("flexible_date_match");
    expect(after.classification).toBe("flexible_date_match");
  });

  it("does not assume flexibility when flexibleDates is false", () => {
    const result = evaluateReadyStayDateMatch({
      requestedArrival: "2026-10-10",
      requestedDeparture: "2026-10-15",
      flexibleDates: false,
      flexibilityDaysBefore: 2,
      flexibilityDaysAfter: 2,
      listingArrival: "2026-10-20",
      listingDeparture: "2026-10-25",
    });
    expect(result.classification).toBe("near_date_match");
    expect(result.withinFlexibility).toBe(false);
  });

  it("marks shorter and longer listings as incomplete alternatives", () => {
    const shorter = evaluateReadyStayDateMatch({
      requestedArrival: "2026-10-10",
      requestedDeparture: "2026-10-15",
      listingArrival: "2026-10-11",
      listingDeparture: "2026-10-14",
    });
    const longer = evaluateReadyStayDateMatch({
      requestedArrival: "2026-10-10",
      requestedDeparture: "2026-10-15",
      listingArrival: "2026-10-10",
      listingDeparture: "2026-10-17",
    });
    expect(shorter.classification).toBe("partial_overlap");
    expect(shorter.partialStayOnly).toBe(true);
    expect(longer.requiresLengthChange).toBe(true);
  });

  it("uses checkout-exclusive date math without timezone shifts", () => {
    const result = evaluateReadyStayDateMatch({
      requestedArrival: "2026-03-07",
      requestedDeparture: "2026-03-10",
      listingArrival: "2026-03-07",
      listingDeparture: "2026-03-10",
    });
    expect(result.listingNights).toBe(3);
    expect(result.requestedNights).toBe(3);
  });

  it("fails safely for invalid listing ranges", () => {
    const result = evaluateReadyStayDateMatch({
      requestedArrival: "2026-10-10",
      requestedDeparture: "2026-10-15",
      listingArrival: "2026-10-15",
      listingDeparture: "2026-10-10",
    });
    expect(result.classification).toBe("no_match");
    expect(result.reasonCodes).toContain("malformed_listing");
  });
});

import { describe, expect, it } from "vitest";

import { evaluateReadyStayBudgetFit } from "@/lib/pixie/ready-stays/budget-fit";
import { evaluateReadyStayCapacity } from "@/lib/pixie/ready-stays/capacity";
import { evaluateReadyStayDateMatch } from "@/lib/pixie/ready-stays/date-matching";
import { normalizeReadyStayListing } from "@/lib/pixie/ready-stays/listing-adapter";
import { isReadyStayResortExcluded, scoreReadyStayMatch } from "@/lib/pixie/ready-stays/scoring";
import { makeReadyStayRow, makeReadyStayTrip } from "@/lib/pixie/tests/ready-stay-test-helpers";

function scored(row = makeReadyStayRow(), state = makeReadyStayTrip()) {
  const normalized = normalizeReadyStayListing(row, { today: "2026-07-11" });
  if (!normalized.ok) throw new Error("fixture failed");
  const dateMatch = evaluateReadyStayDateMatch({
    requestedArrival: state.dates.arrivalDate,
    requestedDeparture: state.dates.departureDate,
    flexibleDates: state.dates.flexibleDates,
    flexibilityDaysBefore: state.dates.flexibilityDaysBefore,
    flexibilityDaysAfter: state.dates.flexibilityDaysAfter,
    listingArrival: normalized.listing.arrivalDate,
    listingDeparture: normalized.listing.departureDate,
  });
  const capacityMatch = evaluateReadyStayCapacity({ party: state.party, sleeps: normalized.listing.sleeps });
  const budgetFit = evaluateReadyStayBudgetFit({ state, listingPriceCents: normalized.listing.listingPriceCents, listingNights: normalized.listing.numberOfNights });
  return scoreReadyStayMatch({ state, listing: normalized.listing, dateMatch, capacityMatch, budgetFit });
}

describe("Ready Stay scoring", () => {
  it("gives exact date matches a strong score", () => {
    const result = scored();
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.reasonCodes).toContain("exact_dates");
  });

  it("preferred and selected resort improve score without bypassing exclusions", () => {
    const base = scored(makeReadyStayRow(), makeReadyStayTrip({ preferences: { ...makeReadyStayTrip().preferences, preferredResorts: [] } }));
    const preferred = scored();
    expect(preferred.score).toBeGreaterThan(base.score);

    const listing = normalizeReadyStayListing(makeReadyStayRow(), { today: "2026-07-11" });
    const excludedState = makeReadyStayTrip({ preferences: { ...makeReadyStayTrip().preferences, excludedResorts: ["Riviera"] } });
    expect(listing.ok && isReadyStayResortExcluded(excludedState, listing.listing)).toBe(true);
  });

  it("budget fit affects scoring conservatively", () => {
    const within = scored(makeReadyStayRow(), makeReadyStayTrip({ budget: { amountCents: 350000, currency: "USD", budgetType: "accommodation_only" } }));
    const over = scored(makeReadyStayRow(), makeReadyStayTrip({ budget: { amountCents: 200000, currency: "USD", budgetType: "accommodation_only" } }));
    expect(within.score).toBeGreaterThan(over.score);
    expect(over.reasonCodes).toContain("over_accommodation_budget");
  });

  it("missing optional preferences remain neutral and repeated calls are stable", () => {
    const state = makeReadyStayTrip({
      preferences: {
        ...makeReadyStayTrip().preferences,
        preferredResorts: [],
        roomPreferences: [],
        resortPriorities: [],
        parkPriorities: [],
        transportationPreferences: [],
      },
    });
    expect(scored(makeReadyStayRow(), state)).toEqual(scored(makeReadyStayRow(), state));
  });

  it("unknown room mapping produces a reason code instead of false confidence", () => {
    const result = scored(makeReadyStayRow({ room_type: "Marketing Villa Name" }));
    expect(result.reasonCodes).toContain("unknown_room_mapping");
  });
});

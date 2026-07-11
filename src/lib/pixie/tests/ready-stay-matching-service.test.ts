import { describe, expect, it } from "vitest";

import { matchPixieReadyStays } from "@/lib/pixie/ready-stays/matching-service";
import { normalizeReadyStayListing } from "@/lib/pixie/ready-stays/listing-adapter";
import { makeReadyStayRow, makeReadyStayTrip } from "@/lib/pixie/tests/ready-stay-test-helpers";

function listing(row = makeReadyStayRow()) {
  const result = normalizeReadyStayListing(row, { today: "2026-07-11" });
  if (!result.ok) throw new Error(result.message);
  return result.listing;
}

describe("Ready Stay matching service", () => {
  it("returns readiness warning for incomplete trips", async () => {
    const trip = makeReadyStayTrip({ dates: { flexibleDates: false }, party: { adults: 0, children: 0, travellers: [] } });
    const result = await matchPixieReadyStays({ tripState: trip, listings: [] });
    expect(result.readiness.ready).toBe(false);
    expect(result.excludedListings[0]?.code).toBe("not_ready");
  });

  it("returns exact group for exact matching trips", async () => {
    const result = await matchPixieReadyStays({ tripState: makeReadyStayTrip(), listings: [listing()] });
    expect(result.groups.exact).toHaveLength(1);
    expect(result.matches[0]?.classification).toBe("exact_match");
    expect(result.matches[0]?.inventoryStatus).toBe("recheck_required_before_booking");
    expect(result.matches[0]?.warnings.join(" ")).not.toMatch(/confirmed available/i);
  });

  it("returns flexible and alternative groups appropriately", async () => {
    const trip = makeReadyStayTrip({
      dates: {
        arrivalDate: "2026-10-10",
        departureDate: "2026-10-15",
        flexibleDates: true,
        flexibilityDaysBefore: 2,
        flexibilityDaysAfter: 2,
      },
    });
    const result = await matchPixieReadyStays({
      tripState: trip,
      listings: [
        listing(makeReadyStayRow({ id: "flex", check_in: "2026-10-12", check_out: "2026-10-17" })),
        listing(makeReadyStayRow({ id: "near", check_in: "2026-10-20", check_out: "2026-10-25" })),
      ],
    });
    expect(result.groups.flexible.map((match) => match.listingId)).toEqual(["flex"]);
    expect(result.groups.alternatives.map((match) => match.listingId)).toContain("near");
  });

  it("returns diagnostics when no listings match hard requirements", async () => {
    const result = await matchPixieReadyStays({
      tripState: makeReadyStayTrip(),
      listings: [listing(makeReadyStayRow({ id: "small", sleeps: 2 }))],
    });
    expect(result.matches).toHaveLength(0);
    expect(result.excludedListings[0]?.code).toBe("insufficient_capacity");
  });

  it("excludes user-excluded resorts and includes typed reasons", async () => {
    const result = await matchPixieReadyStays({
      tripState: makeReadyStayTrip({ preferences: { ...makeReadyStayTrip().preferences, excludedResorts: ["riviera-resort"] } }),
      listings: [listing()],
    });
    expect(result.matches).toHaveLength(0);
    expect(result.excludedListings[0]?.code).toBe("user_excluded_resort");
  });

  it("stable ranking favors exact over flexible and near matches", async () => {
    const trip = makeReadyStayTrip({
      dates: {
        arrivalDate: "2026-10-10",
        departureDate: "2026-10-15",
        flexibleDates: true,
        flexibilityDaysBefore: 2,
        flexibilityDaysAfter: 2,
      },
    });
    const listings = [
      listing(makeReadyStayRow({ id: "near", check_in: "2026-10-20", check_out: "2026-10-25" })),
      listing(makeReadyStayRow({ id: "exact", check_in: "2026-10-10", check_out: "2026-10-15" })),
      listing(makeReadyStayRow({ id: "flex", check_in: "2026-10-12", check_out: "2026-10-17" })),
    ];
    const first = await matchPixieReadyStays({ tripState: trip, listings });
    const second = await matchPixieReadyStays({ tripState: trip, listings });
    expect(first.matches.map((match) => match.listingId)).toEqual(["exact", "flex", "near"]);
    expect(second.matches.map((match) => match.matchId)).toEqual(first.matches.map((match) => match.matchId));
  });

  it("matches through raw public rows and excludes hidden rows", async () => {
    const result = await matchPixieReadyStays({
      tripState: makeReadyStayTrip(),
      rows: [
        makeReadyStayRow({ id: "hidden", status: "test", is_test_listing: true, is_visible_publicly: false }),
        makeReadyStayRow({ id: "exact" }),
      ],
      today: "2026-07-11",
      nowMs: Date.parse("2026-07-11T12:00:00.000Z"),
    });
    expect(result.matches.map((match) => match.listingId)).toEqual(["exact"]);
    expect(result.excludedListings.some((item) => item.listingId === "hidden")).toBe(true);
  });

  it("includes source metadata and inventory disclaimer", async () => {
    const result = await matchPixieReadyStays({ tripState: makeReadyStayTrip(), listings: [listing()] });
    expect(result.matchingVersion).toContain("phase3");
    expect(result.visibilitySource).toContain("isPublicReadyStayRow");
    expect(result.pricingSource).toContain("ready_stays");
    expect(result.inventoryDisclaimerKey).toBe("recheck_required_before_booking");
  });
});

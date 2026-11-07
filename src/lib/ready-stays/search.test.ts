import { describe, expect, it } from "vitest";
import {
  matchesReadyStayDates,
  matchesReadyStayMonth,
  normalizeReadyStayDate,
  readyStayMonthRange,
  resolveReadyStayResortId,
  resolveReadyStaySearchDateFilters,
} from "./search";

describe("Ready Stays search intent", () => {
  const resorts = [{ id: "resort-bcv", slug: "beach-club-villas", calculator_code: "BCV" }];

  it("resolves a canonical resort slug and calculator code to the marketplace UUID", () => {
    expect(resolveReadyStayResortId("beach-club-villas", resorts)).toEqual({ id: "resort-bcv", requested: true });
    expect(resolveReadyStayResortId("BCV", resorts)).toEqual({ id: "resort-bcv", requested: true });
    expect(resolveReadyStayResortId("resort-bcv", resorts)).toEqual({ id: "resort-bcv", requested: true });
  });

  it("marks unknown resorts as requested without accidentally removing the filter", () => {
    expect(resolveReadyStayResortId("unknown-resort", resorts)).toEqual({ id: null, requested: true });
  });

  it("matches exact fixed check-in and checkout dates and validates date parameters", () => {
    const stay = { check_in: "2027-01-10", check_out: "2027-01-17" };
    expect(matchesReadyStayDates(stay, "2027-01-10", "2027-01-17")).toBe(true);
    expect(matchesReadyStayDates(stay, "2027-01-09", "2027-01-17")).toBe(false);
    expect(matchesReadyStayDates(stay, "2027-01-10")).toBe(true);
    expect(matchesReadyStayDates(stay, undefined, "2027-01-17")).toBe(true);
    expect(matchesReadyStayDates(stay, "2027-01-11")).toBe(false);
    expect(normalizeReadyStayDate("2027-02-29")).toBeUndefined();
    expect(normalizeReadyStayDate("2027-01-10")).toBe("2027-01-10");
  });

  it("defaults homepage date selections to specific mode and excludes flexible filters", () => {
    expect(
      resolveReadyStaySearchDateFilters({
        checkIn: "2027-01-10",
        checkOut: "2027-01-17",
        month: "2027-02",
        holiday: "christmas",
      }),
    ).toEqual({ dateMode: "specific", checkIn: "2027-01-10", checkOut: "2027-01-17" });
  });

  it("defaults direct entry to flexible browsing without requiring a month", () => {
    expect(resolveReadyStaySearchDateFilters({})).toEqual({ dateMode: "flexible", month: undefined, holiday: undefined });
  });

  it("uses only flexible filters when flexible mode is explicit", () => {
    expect(
      resolveReadyStaySearchDateFilters({
        dateMode: "flexible",
        checkIn: "2027-01-10",
        checkOut: "2027-01-17",
        month: "2027-02",
        holiday: "christmas",
      }),
    ).toEqual({ dateMode: "flexible", month: "2027-02", holiday: "christmas" });
  });

  it("matches flexible stays overlapping the selected month, excluding checkout-only overlap", () => {
    expect(readyStayMonthRange("2027-12")).toEqual({ start: "2027-12-01", endExclusive: "2028-01-01" });
    expect(matchesReadyStayMonth({ check_in: "2027-01-29", check_out: "2027-02-03" }, "2027-02")).toBe(true);
    expect(matchesReadyStayMonth({ check_in: "2027-01-25", check_out: "2027-02-01" }, "2027-02")).toBe(false);
    expect(matchesReadyStayMonth({ check_in: "2027-03-01", check_out: "2027-03-08" }, "2027-02")).toBe(false);
  });

  it("uses both the month and year when matching flexible stays", () => {
    expect(matchesReadyStayMonth({ check_in: "2026-12-04", check_out: "2026-12-11" }, "2026-12")).toBe(true);
    expect(matchesReadyStayMonth({ check_in: "2027-12-04", check_out: "2027-12-11" }, "2026-12")).toBe(false);
    expect(matchesReadyStayMonth({ check_in: "2027-01-04", check_out: "2027-01-11" }, "2027-01")).toBe(true);
    expect(matchesReadyStayMonth({ check_in: "2027-02-04", check_out: "2027-02-11" }, "2027-02")).toBe(true);
  });
});

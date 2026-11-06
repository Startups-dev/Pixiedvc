import { describe, expect, it } from "vitest";
import { matchesReadyStayDates, normalizeReadyStayDate, resolveReadyStayResortId } from "./search";

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
    expect(normalizeReadyStayDate("2027-02-29")).toBeUndefined();
    expect(normalizeReadyStayDate("2027-01-10")).toBe("2027-01-10");
  });
});

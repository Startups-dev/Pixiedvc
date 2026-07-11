import { describe, expect, it } from "vitest";

import { RATE_BY_CATEGORY as sourceRates, TIER_DISPLAY_NAMES as sourceTierNames } from "../src/engine/rates";
import { quoteStay as sourceQuoteStay } from "../src/engine/calc";
import { Resorts as sourceResorts } from "../src/engine/charts";
import {
  RATE_BY_CATEGORY as distRates,
  TIER_DISPLAY_NAMES as distTierNames,
  quoteStay as distQuoteStay,
  Resorts as distResorts,
} from "../dist/index.js";

describe("calculator pricing contract", () => {
  it("source and generated package output use the same Access-tier rates", () => {
    expect(distRates).toEqual(sourceRates);
    expect(distTierNames).toEqual(sourceTierNames);
    expect(distRates).toEqual({
      PREMIER_ACCESS: 29,
      PRIORITY_ACCESS: 26,
      SELECT_ACCESS: 24,
      VALUE_ACCESS: 22,
    });
  });

  it("source and generated package output use the same resort categories", () => {
    expect(Object.fromEntries(distResorts.map((resort) => [resort.code, resort.category]))).toEqual(
      Object.fromEntries(sourceResorts.map((resort) => [resort.code, resort.category])),
    );
  });

  it("quotes Select Access resorts at the Select Access rate", () => {
    const source = sourceQuoteStay({
      resortCode: "BLT",
      room: "STUDIO",
      view: "S",
      checkIn: "2027-09-07",
      nights: 1,
      chartYear: 2027,
      bookingDate: "2027-01-01",
    });
    const dist = distQuoteStay({
      resortCode: "BLT",
      room: "STUDIO",
      view: "S",
      checkIn: "2027-09-07",
      nights: 1,
      chartYear: 2027,
      bookingDate: "2027-01-01",
    });
    expect(source.pppUSD).toBe(24);
    expect(dist.pppUSD).toBe(source.pppUSD);
    expect(dist.pricingTier).toBe("Select Access");
  });

  it("Premier and Priority Access tiers downgrade to Select Access inside seven months", () => {
    const premier = distQuoteStay({
      resortCode: "BCV",
      room: "STUDIO",
      view: "S",
      checkIn: "2027-09-07",
      nights: 1,
      chartYear: 2027,
      bookingDate: "2027-06-01",
    });
    const priority = distQuoteStay({
      resortCode: "BWV",
      room: "STUDIO",
      view: "S",
      checkIn: "2027-09-07",
      nights: 1,
      chartYear: 2027,
      bookingDate: "2027-06-01",
    });
    expect(premier.pppUSD).toBe(24);
    expect(priority.pppUSD).toBe(24);
    expect(premier.pricingTier).toBe("Select Access");
    expect(priority.pricingTier).toBe("Select Access");
  });

  it("Premier and Priority Access tiers keep their rate seven or more months out", () => {
    const premier = distQuoteStay({
      resortCode: "BCV",
      room: "STUDIO",
      view: "S",
      checkIn: "2027-09-07",
      nights: 1,
      chartYear: 2027,
      bookingDate: "2026-09-01",
    });
    const priority = distQuoteStay({
      resortCode: "BWV",
      room: "STUDIO",
      view: "S",
      checkIn: "2027-09-07",
      nights: 1,
      chartYear: 2027,
      bookingDate: "2026-09-01",
    });
    expect(premier.pppUSD).toBe(29);
    expect(priority.pppUSD).toBe(26);
  });
});

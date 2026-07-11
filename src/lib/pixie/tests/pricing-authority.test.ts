import { describe, expect, it } from "vitest";

import { RATE_BY_CATEGORY as packageRates, Resorts as packageResorts, quoteStay as packageQuoteStay } from "pixiedvc-calculator";
import { RATE_BY_CATEGORY as sourceRates } from "../../../../packages/pixiedvc-calculator/src/engine/rates";
import { resortsData as sourceResorts } from "../../../../packages/pixiedvc-calculator/src/data/resorts";

describe("Pixie pricing authority and package import path", () => {
  it("production package import and source rates match", () => {
    expect(packageRates).toEqual(sourceRates);
    expect(packageRates).toEqual({
      PREMIER_ACCESS: 29,
      PRIORITY_ACCESS: 26,
      SELECT_ACCESS: 24,
      VALUE_ACCESS: 22,
    });
  });

  it("production package import and source resort categories match", () => {
    const sourceCategories = Object.fromEntries(sourceResorts.map((resort) => [resort.code, resort.category]));
    const packageCategories = Object.fromEntries(packageResorts.map((resort) => [resort.code, resort.category]));
    expect(packageCategories).toEqual(sourceCategories);
    expect(packageCategories.AKV).toBe("SELECT_ACCESS");
    expect(packageCategories.BCV).toBe("PREMIER_ACCESS");
    expect(packageCategories.VGF).toBe("PRIORITY_ACCESS");
    expect(packageCategories.OKW).toBe("VALUE_ACCESS");
  });

  it("production package quote uses Access-tier pricing", () => {
    const result = packageQuoteStay({
      resortCode: "BLT",
      room: "STUDIO",
      view: "S",
      checkIn: "2027-09-07",
      nights: 1,
      year: 2027,
      chartYear: 2027,
      bookingDate: "2027-01-01",
    });
    expect(result.pppUSD).toBe(24);
    expect(result.pricingTier).toBe("Select Access");
  });
});

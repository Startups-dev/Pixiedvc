import { describe, expect, it } from "vitest";

import {
  PIXIE_NON_WDW_CALCULATOR_CODES,
  PIXIE_UNSUPPORTED_WDW_RESORTS,
  PIXIE_WDW_RESORT_CATALOG,
  getPixieWdwResortCatalog,
} from "@/lib/pixie/resorts/catalog";

describe("Pixie WDW resort catalog", () => {
  it("contains only verified WDW DVC calculator resorts", () => {
    expect(PIXIE_WDW_RESORT_CATALOG.map((resort) => resort.calculatorCode)).toEqual([
      "AKV",
      "BLT",
      "BCV",
      "BWV",
      "BRV",
      "CCV",
      "OKW",
      "PVB",
      "RVA",
      "SSR",
      "VGF",
    ]);
  });

  it("excludes non-WDW calculator resorts", () => {
    const codes = PIXIE_WDW_RESORT_CATALOG.map((resort) => resort.calculatorCode);
    for (const code of PIXIE_NON_WDW_CALCULATOR_CODES) {
      expect(codes).not.toContain(code);
    }
  });

  it("excludes Fort Wilderness until calculator metadata is complete", () => {
    expect(PIXIE_WDW_RESORT_CATALOG.map((resort) => resort.slug)).not.toContain("fort-wilderness-cabins");
    expect(PIXIE_UNSUPPORTED_WDW_RESORTS[0]?.calculatorCode).toBe("CFW");
  });

  it("each catalog resort has calculator code, booking value, image input, and rooms", () => {
    for (const resort of getPixieWdwResortCatalog()) {
      expect(resort.id).toBeTruthy();
      expect(resort.slug).toBeTruthy();
      expect(resort.bookingValue).toBe(resort.slug);
      expect(resort.image.resortCode).toBe(resort.calculatorCode);
      expect(resort.roomTypes.length).toBeGreaterThan(0);
      expect(resort.supported).toBe(true);
    }
  });

  it("keeps canonical catalog order stable", () => {
    expect(PIXIE_WDW_RESORT_CATALOG.map((resort) => resort.id)).toEqual([
      "akv",
      "blt",
      "bcv",
      "bwv",
      "brv",
      "ccv",
      "okw",
      "pvb",
      "rva",
      "ssr",
      "vgf",
    ]);
  });

  it("does not use display names as the Pixie permanent ID", () => {
    expect(PIXIE_WDW_RESORT_CATALOG.find((resort) => resort.displayName.includes("Bay Lake"))?.id).toBe("blt");
  });
});

import { describe, expect, it } from "vitest";

import {
  getBookingValueForPixieResort,
  getCalculatorCodeForPixieResort,
  getPixieResortById,
  getPixieResortBySlug,
  resolvePixieResortId,
} from "@/lib/pixie/resorts/identifiers";

describe("Pixie resort identifiers", () => {
  it("resolves slugs and aliases", () => {
    expect(resolvePixieResortId("bay-lake-tower")).toMatchObject({ ok: true, resort: { id: "blt" } });
    expect(resolvePixieResortId("riviera")).toMatchObject({ ok: true, resort: { id: "rva" } });
    expect(resolvePixieResortId("animal-kingdom-kidani")).toMatchObject({ ok: true, resort: { id: "akv" } });
  });

  it("resolves calculator codes", () => {
    expect(resolvePixieResortId("VGF")).toMatchObject({ ok: true, resort: { id: "vgf" } });
    expect(getCalculatorCodeForPixieResort("vgf")).toBe("VGF");
  });

  it("returns booking-form slug values", () => {
    expect(getBookingValueForPixieResort("blt")).toBe("bay-lake-tower");
  });

  it("rejects unknown resort identifiers safely", () => {
    expect(resolvePixieResortId("made-up-resort")).toMatchObject({ ok: false, code: "unknown_resort_identifier" });
  });

  it("rejects non-WDW resort identifiers", () => {
    expect(resolvePixieResortId("AUL")).toMatchObject({ ok: false, code: "unsupported_non_wdw_resort" });
    expect(resolvePixieResortId("vero-beach")).toMatchObject({ ok: false, code: "unsupported_non_wdw_resort" });
  });

  it("rejects unsupported WDW identifiers", () => {
    expect(resolvePixieResortId("fort-wilderness-cabins")).toMatchObject({ ok: false, code: "unsupported_resort" });
  });

  it("does not promote display-name variations into unsafe permanent IDs", () => {
    const resolved = resolvePixieResortId("Bay Lake Tower at Disney's Contemporary Resort");
    expect(resolved).toMatchObject({ ok: true, resort: { id: "blt", slug: "bay-lake-tower" } });
    expect(getPixieResortById("Bay Lake Tower at Disney's Contemporary Resort")).toBeNull();
  });

  it("fails closed for bare AKV building aliases and historical KV code", () => {
    expect(resolvePixieResortId("AKV")).toMatchObject({ ok: true, resort: { id: "akv" } });
    expect(resolvePixieResortId("animal-kingdom-kidani")).toMatchObject({ ok: true, resort: { id: "akv" } });
    expect(resolvePixieResortId("animal-kingdom-jambo")).toMatchObject({ ok: true, resort: { id: "akv" } });
    expect(resolvePixieResortId("kidani")).toMatchObject({ ok: false, code: "ambiguous_resort_identifier" });
    expect(resolvePixieResortId("jambo")).toMatchObject({ ok: false, code: "ambiguous_resort_identifier" });
    expect(resolvePixieResortId("KV")).toMatchObject({ ok: false, code: "ambiguous_resort_identifier" });
  });

  it("gets resorts by canonical slug only inside the WDW catalog", () => {
    expect(getPixieResortBySlug("boardwalk")).toMatchObject({ id: "bwv" });
    expect(getPixieResortBySlug("aulani")).toBeNull();
  });
});

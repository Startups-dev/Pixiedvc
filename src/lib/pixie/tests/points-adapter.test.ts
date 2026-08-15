import { describe, expect, it } from "vitest";

import { estimateDvcPoints, PIXIE_SUPPORTED_CALCULATOR_YEARS } from "@/lib/pixie/pricing/points-adapter";

describe("Pixie DVC points adapter", () => {
  it("returns exact BLT Studio Standard View points", () => {
    const result = estimateDvcPoints({
      resortId: "blt",
      roomTypeId: "studio",
      roomCode: "STUDIO",
      viewCode: "S",
      arrivalDate: "2026-09-01",
      departureDate: "2026-09-03",
    });

    expect(result).toMatchObject({
      supported: true,
      kind: "exact",
      totalPoints: 26,
      calculatorRoomCode: "STUDIO",
      calculatorViewCode: "S",
    });
  });

  it("returns exact BLT Studio Lake View points", () => {
    const result = estimateDvcPoints({
      resortId: "blt",
      roomTypeId: "studio",
      roomCode: "STUDIO",
      viewCode: "L",
      arrivalDate: "2026-09-01",
      departureDate: "2026-09-03",
    });

    expect(result).toMatchObject({
      supported: true,
      kind: "exact",
      totalPoints: 32,
      calculatorRoomCode: "STUDIO",
      calculatorViewCode: "L",
    });
  });

  it("returns exact BLT Studio Theme Park View points", () => {
    const result = estimateDvcPoints({
      resortId: "blt",
      roomTypeId: "studio",
      roomCode: "STUDIO",
      viewCode: "T",
      arrivalDate: "2026-09-01",
      departureDate: "2026-09-03",
    });

    expect(result).toMatchObject({
      supported: true,
      kind: "exact",
      totalPoints: 36,
      calculatorRoomCode: "STUDIO",
      calculatorViewCode: "T",
    });
  });

  it("returns a planning range for generic BLT Studio instead of defaulting to Standard View", () => {
    const result = estimateDvcPoints({
      resortId: "blt",
      roomTypeId: "studio",
      arrivalDate: "2026-09-01",
      departureDate: "2026-09-03",
    });

    expect(result).toMatchObject({
      supported: true,
      kind: "range",
      minPoints: 26,
      maxPoints: 36,
    });
    expect(result.totalPoints).toBeUndefined();
    if (result.supported && result.kind === "range") {
      expect(result.options.map((option) => option.accommodation.viewCode)).toEqual(["S", "L", "T"]);
      expect(result.options.map((option) => option.totalPoints)).toEqual([26, 32, 36]);
    }
  });

  it("does not collapse multiple PVB studio-like room codes into one generic studio option", () => {
    const result = estimateDvcPoints({
      resortId: "pvb",
      roomTypeId: "studio",
      arrivalDate: "2026-09-01",
      departureDate: "2026-09-03",
    });

    expect(result.supported).toBe(true);
    expect(result.kind).toBe("range");
    if (result.supported && result.kind === "range") {
      const roomCodes = new Set(result.options.map((option) => option.accommodation.roomCode));
      expect(roomCodes.has("STUDIO")).toBe(true);
      expect(roomCodes.has("DUOSTUDIO")).toBe(true);
      expect(roomCodes.has("DELUXESTUDIO")).toBe(true);
      expect(roomCodes.size).toBeGreaterThan(1);
    }
  });

  it("returns exact planning estimate for single-category BCV generic Studio", () => {
    const result = estimateDvcPoints({
      resortId: "bcv",
      roomTypeId: "studio",
      arrivalDate: "2026-09-01",
      departureDate: "2026-09-03",
    });

    expect(result).toMatchObject({
      supported: true,
      kind: "exact",
      totalPoints: 28,
      calculatorRoomCode: "STUDIO",
      calculatorViewCode: "S",
    });
  });

  it("invalid dates fail", () => {
    expect(estimateDvcPoints({ resortId: "blt", roomTypeId: "studio", arrivalDate: "2027-09-09", departureDate: "2027-09-07" })).toMatchObject({
      supported: false,
      kind: "unavailable",
      errorReason: "invalid_dates",
    });
  });

  it("unsupported year fails clearly instead of calculator fallback", () => {
    expect(estimateDvcPoints({ resortId: "blt", roomTypeId: "studio", arrivalDate: "2028-09-07", departureDate: "2028-09-09" })).toMatchObject({
      supported: false,
      kind: "unavailable",
      errorReason: "unsupported_year",
    });
  });

  it("unsupported room type fails clearly", () => {
    expect(estimateDvcPoints({ resortId: "bcv", roomTypeId: "three_bedroom_grand_villa", arrivalDate: "2027-09-07", departureDate: "2027-09-09" })).toMatchObject({
      supported: false,
      kind: "unavailable",
      errorReason: "unsupported_room_type",
    });
  });

  it("checkout date is not charged as a stay night for exact estimates", () => {
    const result = estimateDvcPoints({
      resortId: "blt",
      roomTypeId: "studio",
      roomCode: "STUDIO",
      viewCode: "L",
      arrivalDate: "2027-09-07",
      departureDate: "2027-09-09",
    });
    expect(result.supported && result.kind === "exact" && result.nightlyPoints.map((night) => night.night)).toEqual(["2027-09-07", "2027-09-08"]);
  });

  it("cross-season generic VGF studio remains a structured range", () => {
    const result = estimateDvcPoints({ resortId: "vgf", roomTypeId: "studio", arrivalDate: "2027-12-14", departureDate: "2027-12-17" });
    expect(result).toMatchObject({ supported: true, kind: "range" });
    if (result.supported && result.kind === "range") {
      expect(result.options.length).toBeGreaterThan(1);
      expect(new Set(result.options.map((option) => option.accommodation.roomCode)).size).toBeGreaterThan(1);
    }
  });

  it("cross-year calculation preserves a range where multiple BLT categories exist", () => {
    const result = estimateDvcPoints({ resortId: "blt", roomTypeId: "studio", arrivalDate: "2026-12-31", departureDate: "2027-01-02" });
    expect(result.supported).toBe(true);
    if (result.supported) {
      expect(result.kind).toBe("range");
      expect(result.calculatorYears).toEqual([2026, 2027]);
      expect(result.totalPoints).toBeUndefined();
    }
  });

  it("records calculator year coverage", () => {
    expect(PIXIE_SUPPORTED_CALCULATOR_YEARS).toEqual([2025, 2026, 2027]);
  });
});

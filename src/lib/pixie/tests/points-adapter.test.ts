import { describe, expect, it } from "vitest";
import { quoteStay } from "pixiedvc-calculator";

import { estimateDvcPoints, PIXIE_SUPPORTED_CALCULATOR_YEARS } from "@/lib/pixie/pricing/points-adapter";

describe("Pixie DVC points adapter", () => {
  it("supported resort-room-date returns calculator result", () => {
    const result = estimateDvcPoints({ resortId: "blt", roomTypeId: "studio", arrivalDate: "2027-09-07", departureDate: "2027-09-09" });
    const expected = quoteStay({ resortCode: "BLT", room: "STUDIO", view: "S", checkIn: "2027-09-07", nights: 2 });
    expect(result.supported).toBe(true);
    if (result.supported) expect(result.totalPoints).toBe(expected.totalPoints);
  });

  it("invalid dates fail", () => {
    expect(estimateDvcPoints({ resortId: "blt", roomTypeId: "studio", arrivalDate: "2027-09-09", departureDate: "2027-09-07" })).toMatchObject({
      supported: false,
      errorReason: "invalid_dates",
    });
  });

  it("unsupported year fails clearly instead of calculator fallback", () => {
    expect(estimateDvcPoints({ resortId: "blt", roomTypeId: "studio", arrivalDate: "2028-09-07", departureDate: "2028-09-09" })).toMatchObject({
      supported: false,
      errorReason: "unsupported_year",
    });
  });

  it("unsupported room type fails clearly", () => {
    expect(estimateDvcPoints({ resortId: "bcv", roomTypeId: "three_bedroom_grand_villa", arrivalDate: "2027-09-07", departureDate: "2027-09-09" })).toMatchObject({
      supported: false,
      errorReason: "unsupported_room_type",
    });
  });

  it("checkout date is not charged as a stay night", () => {
    const result = estimateDvcPoints({ resortId: "blt", roomTypeId: "studio", arrivalDate: "2027-09-07", departureDate: "2027-09-09" });
    expect(result.supported && result.nightlyPoints.map((night) => night.night)).toEqual(["2027-09-07", "2027-09-08"]);
  });

  it("cross-season calculation matches existing calculator behavior", () => {
    const result = estimateDvcPoints({ resortId: "vgf", roomTypeId: "studio", arrivalDate: "2027-12-14", departureDate: "2027-12-17" });
    const expected = quoteStay({ resortCode: "VGF", room: "STUDIO", view: "R", checkIn: "2027-12-14", nights: 3 });
    expect(result.supported && result.totalPoints).toBe(expected.totalPoints);
  });

  it("cross-year unsupported chart gaps fail clearly where calculator data is incomplete", () => {
    const result = estimateDvcPoints({ resortId: "blt", roomTypeId: "studio", arrivalDate: "2026-12-31", departureDate: "2027-01-02" });
    expect(result.supported).toBe(false);
    if (!result.supported) {
      expect(result.errorReason).toBe("calculator_error");
      expect(result.calculatorYears).toEqual([2026, 2027]);
    }
  });

  it("does not silently substitute another room", () => {
    const result = estimateDvcPoints({ resortId: "rva", roomTypeId: "studio", arrivalDate: "2027-09-07", departureDate: "2027-09-09" });
    expect(result).toMatchObject({ supported: false, errorReason: "unsupported_room_type" });
  });

  it("records calculator year coverage", () => {
    expect(PIXIE_SUPPORTED_CALCULATOR_YEARS).toEqual([2025, 2026, 2027]);
  });
});

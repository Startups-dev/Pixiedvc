import { describe, expect, it } from "vitest";

import { estimateGuestAccommodationPrice, PIXIE_GUEST_PRICING_SOURCE } from "@/lib/pixie/pricing/guest-price-adapter";

describe("Pixie guest price adapter", () => {
  it("supported point total returns trusted guest estimate", () => {
    const result = estimateGuestAccommodationPrice({ resortId: "blt", points: 100, arrivalDate: "2027-09-07", bookingDate: "2027-01-01" });
    expect(result.supported).toBe(true);
    if (result.supported) {
      expect(result.estimatedRatePerPointCents).toBe(2300);
      expect(result.estimatedTotalCents).toBe(230000);
    }
  });

  it("Premium pricing downgrades inside seven months according to runtime calculator policy", () => {
    const result = estimateGuestAccommodationPrice({ resortId: "vgf", points: 10, arrivalDate: "2027-09-07", bookingDate: "2027-06-01" });
    expect(result.supported).toBe(true);
    if (result.supported) expect(result.estimatedRatePerPointCents).toBe(2300);
  });

  it("uses Premium tier when booking window supports it", () => {
    const result = estimateGuestAccommodationPrice({ resortId: "vgf", points: 10, arrivalDate: "2027-09-07", bookingDate: "2026-09-01" });
    expect(result.supported).toBe(true);
    if (result.supported) expect(result.estimatedRatePerPointCents).toBe(2500);
  });

  it("unsupported pricing category returns unsupported", () => {
    expect(estimateGuestAccommodationPrice({ resortId: "unknown", points: 100 })).toMatchObject({ supported: false, unsupportedReason: "unknown_resort" });
  });

  it("pricing source and currency are recorded", () => {
    const result = estimateGuestAccommodationPrice({ resortId: "okw", points: 50 });
    expect(result.currency).toBe("USD");
    expect(result.pricingSource).toBe(PIXIE_GUEST_PRICING_SOURCE);
  });

  it("estimate is clearly marked as non-confirmed", () => {
    const result = estimateGuestAccommodationPrice({ resortId: "okw", points: 50 });
    expect(result.supported && result.estimateDisclaimerKey).toBe("custom_request_estimate_not_confirmed");
  });

  it("uses integer cents without floating-point money drift", () => {
    const result = estimateGuestAccommodationPrice({ resortId: "okw", points: 3 });
    expect(result.supported && result.estimatedTotalCents).toBe(6000);
  });

  it("does not expose owner payout as guest pricing", () => {
    const result = estimateGuestAccommodationPrice({ resortId: "okw", points: 10 });
    expect(result.supported && result.estimatedRatePerPointCents).toBe(2000);
    expect(result.supported && result.estimatedRatePerPointCents).not.toBe(1500);
  });

  it("missing points are unsupported", () => {
    expect(estimateGuestAccommodationPrice({ resortId: "okw", points: 0 })).toMatchObject({ supported: false, unsupportedReason: "missing_points" });
  });
});

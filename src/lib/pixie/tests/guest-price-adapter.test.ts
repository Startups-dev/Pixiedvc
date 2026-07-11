import { describe, expect, it } from "vitest";

import {
  estimateGuestAccommodationPrice,
  getReadyStayListingPrice,
  PIXIE_CUSTOM_REQUEST_PRICING_SOURCE,
  PIXIE_GUEST_PRICING_VERSION,
  PIXIE_READY_STAY_PRICING_SOURCE,
} from "@/lib/pixie/pricing/guest-price-adapter";

describe("Pixie guest price adapter", () => {
  it("supported point total returns trusted guest estimate", () => {
    const result = estimateGuestAccommodationPrice({ pricingContext: "custom_request_estimate", resortId: "blt", points: 100, arrivalDate: "2027-09-07", bookingDate: "2027-01-01" });
    expect(result.supported).toBe(true);
    if (result.supported && result.pricingContext === "custom_request_estimate") {
      expect(result.ratePerPointCents).toBe(2400);
      expect(result.estimatedTotalCents).toBe(240000);
      expect(result.pricingContext).toBe("custom_request_estimate");
      expect(result.estimateStatus).toBe("estimate");
    }
  });

  it("priority access pricing downgrades inside seven months according to calculator policy", () => {
    const result = estimateGuestAccommodationPrice({ pricingContext: "custom_request_estimate", resortId: "vgf", points: 10, arrivalDate: "2027-09-07", bookingDate: "2027-06-01" });
    expect(result.supported).toBe(true);
    if (result.supported && result.pricingContext === "custom_request_estimate") expect(result.ratePerPointCents).toBe(2400);
  });

  it("uses priority access tier when booking window supports it", () => {
    const result = estimateGuestAccommodationPrice({ pricingContext: "custom_request_estimate", resortId: "vgf", points: 10, arrivalDate: "2027-09-07", bookingDate: "2026-09-01" });
    expect(result.supported).toBe(true);
    if (result.supported && result.pricingContext === "custom_request_estimate") expect(result.ratePerPointCents).toBe(2600);
  });

  it("unsupported pricing category returns unsupported", () => {
    expect(estimateGuestAccommodationPrice({ pricingContext: "custom_request_estimate", resortId: "unknown", points: 100 })).toMatchObject({ supported: false, unsupportedReason: "unknown_resort" });
  });

  it("pricing source, version, and currency are recorded", () => {
    const result = estimateGuestAccommodationPrice({ pricingContext: "custom_request_estimate", resortId: "okw", points: 50 });
    expect(result.currency).toBe("USD");
    expect(result.source).toBe(PIXIE_CUSTOM_REQUEST_PRICING_SOURCE);
    expect(result.sourceVersion).toBe(PIXIE_GUEST_PRICING_VERSION);
  });

  it("estimate is clearly marked as non-confirmed", () => {
    const result = estimateGuestAccommodationPrice({ pricingContext: "custom_request_estimate", resortId: "okw", points: 50 });
    expect(result.supported && result.estimateStatus).toBe("estimate");
  });

  it("uses integer cents without floating-point money drift", () => {
    const result = estimateGuestAccommodationPrice({ pricingContext: "custom_request_estimate", resortId: "okw", points: 3 });
    expect(result.supported && result.pricingContext === "custom_request_estimate" && result.estimatedTotalCents).toBe(6600);
  });

  it("does not expose owner payout as guest pricing", () => {
    const result = estimateGuestAccommodationPrice({ pricingContext: "custom_request_estimate", resortId: "okw", points: 10 });
    expect(result.supported && result.ratePerPointCents).toBe(2200);
    expect(result.supported && result.ratePerPointCents).not.toBe(1600);
    expect(result.supported && result.ratePerPointCents).not.toBe(1800);
  });

  it("missing points are unsupported", () => {
    expect(estimateGuestAccommodationPrice({ pricingContext: "custom_request_estimate", resortId: "okw", points: 0 })).toMatchObject({ supported: false, unsupportedReason: "missing_points" });
  });

  it("generic pricing without custom context is rejected", () => {
    const result = estimateGuestAccommodationPrice({ pricingContext: "ready_stay_listing_price" as never, resortId: "okw", points: 10 });
    expect(result).toMatchObject({ supported: false, pricingContext: "custom_request_estimate", unsupportedReason: "invalid_pricing_context" });
  });

  it("Ready Stay listing pricing is tied to a listing and separate source", () => {
    const result = getReadyStayListingPrice({
      pricingContext: "ready_stay_listing_price",
      readyStayId: "stay-1",
      points: 100,
      guestPricePerPointCents: 3000,
    });
    expect(result).toMatchObject({
      supported: true,
      pricingContext: "ready_stay_listing_price",
      confirmedListingTotalCents: 300000,
      ratePerPointCents: 3000,
      source: PIXIE_READY_STAY_PRICING_SOURCE,
      estimateStatus: "listing_price",
    });
  });

  it("Ready Stay test listing total stays listing-specific", () => {
    const result = getReadyStayListingPrice({
      pricingContext: "ready_stay_listing_price",
      readyStayId: "test-stay",
      points: 100,
      guestPricePerPointCents: 3000,
      isTestListing: true,
      testGuestTotalCents: 123456,
    });
    expect(result.supported && result.pricingContext === "ready_stay_listing_price" && result.confirmedListingTotalCents).toBe(123456);
  });

  it("Ready Stay listing pricing requires a listing", () => {
    expect(getReadyStayListingPrice({ pricingContext: "ready_stay_listing_price", points: 100, guestPricePerPointCents: 3000 })).toMatchObject({
      supported: false,
      unsupportedReason: "missing_listing",
    });
  });
});

import { RATE_BY_CATEGORY, Resorts as CalculatorResorts, TIER_DISPLAY_NAMES } from "pixiedvc-calculator";

import { getReadyStayGuestTotalCents } from "@/lib/ready-stays/test-pricing";
import { getPixieResortById } from "@/lib/pixie/resorts/identifiers";
import type { PixieResortId } from "@/lib/pixie/resorts/types";
import type { PixieGuestPriceEstimate, PixiePricingContext } from "@/lib/pixie/pricing/types";

export const PIXIE_CUSTOM_REQUEST_PRICING_SOURCE = "pixiedvc-calculator source RATE_BY_CATEGORY with Access-tier booking-window policy";
export const PIXIE_READY_STAY_PRICING_SOURCE = "ready_stays listing guest_price_per_point_cents/test_guest_total_cents";
export const PIXIE_GUEST_PRICING_VERSION = "2026-07-10.phase2.5";

const CUSTOM_REQUEST_CATEGORIES = ["PREMIER_ACCESS", "PRIORITY_ACCESS", "SELECT_ACCESS", "VALUE_ACCESS"] as const;

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  return date.toISOString().slice(0, 10) === value ? date : null;
}

function differenceInCalendarMonths(later: Date, earlier: Date) {
  return (later.getUTCFullYear() - earlier.getUTCFullYear()) * 12 + later.getUTCMonth() - earlier.getUTCMonth();
}

function unsupported(
  pricingContext: PixiePricingContext,
  source: string,
  reason: Extract<PixieGuestPriceEstimate, { supported: false }>["unsupportedReason"],
  warnings: string[] = [],
  pricingCategory?: string,
): PixieGuestPriceEstimate {
  return {
    supported: false,
    pricingContext,
    currency: "USD",
    source,
    sourceVersion: PIXIE_GUEST_PRICING_VERSION,
    estimateStatus: "unsupported",
    pricingCategory,
    unsupportedReason: reason,
    warnings,
  };
}

export function estimateGuestAccommodationPrice(params: {
  pricingContext: "custom_request_estimate";
  resortId: PixieResortId | string | null | undefined;
  points?: number | null;
  arrivalDate?: string | null;
  bookingDate?: string | null;
}): PixieGuestPriceEstimate {
  if (params.pricingContext !== "custom_request_estimate") {
    return unsupported("custom_request_estimate", PIXIE_CUSTOM_REQUEST_PRICING_SOURCE, "invalid_pricing_context");
  }
  const points = params.points;
  if (!Number.isFinite(points) || !points || points <= 0) return unsupported("custom_request_estimate", PIXIE_CUSTOM_REQUEST_PRICING_SOURCE, "missing_points");
  const resort = getPixieResortById(params.resortId);
  if (!resort) return unsupported("custom_request_estimate", PIXIE_CUSTOM_REQUEST_PRICING_SOURCE, "unknown_resort");

  const meta = CalculatorResorts.find((item) => item.code === resort.calculatorCode);
  if (!meta) return unsupported("custom_request_estimate", PIXIE_CUSTOM_REQUEST_PRICING_SOURCE, "unknown_resort");
  const arrival = params.arrivalDate ? parseDateOnly(params.arrivalDate) : null;
  const booking = params.bookingDate ? parseDateOnly(params.bookingDate) : new Date();
  if (params.arrivalDate && !arrival) return unsupported("custom_request_estimate", PIXIE_CUSTOM_REQUEST_PRICING_SOURCE, "invalid_dates");

  let pricingCategory = String(meta.category);
  if (!CUSTOM_REQUEST_CATEGORIES.includes(pricingCategory as (typeof CUSTOM_REQUEST_CATEGORIES)[number])) {
    return unsupported(
      "custom_request_estimate",
      PIXIE_CUSTOM_REQUEST_PRICING_SOURCE,
      "ambiguous_pricing_source",
      [`Unsupported or stale calculator pricing category: ${pricingCategory}.`],
      pricingCategory,
    );
  }
  if ((pricingCategory === "PREMIER_ACCESS" || pricingCategory === "PRIORITY_ACCESS") && arrival) {
    const months = differenceInCalendarMonths(arrival, booking ?? new Date());
    if (months < 7) pricingCategory = "SELECT_ACCESS";
  }

  const rateDollars = (RATE_BY_CATEGORY as Record<string, number>)[pricingCategory];
  if (!Number.isFinite(rateDollars)) {
    return unsupported("custom_request_estimate", PIXIE_CUSTOM_REQUEST_PRICING_SOURCE, "unsupported_pricing_category", [], pricingCategory);
  }
  const ratePerPointCents = Math.round(rateDollars * 100);
  const estimatedTotalCents = Math.round(points * ratePerPointCents);
  return {
    supported: true,
    pricingContext: "custom_request_estimate",
    estimatedTotalCents,
    ratePerPointCents,
    currency: "USD",
    pricingCategory: (TIER_DISPLAY_NAMES as Record<string, string>)[pricingCategory] ?? pricingCategory,
    source: PIXIE_CUSTOM_REQUEST_PRICING_SOURCE,
    sourceVersion: PIXIE_GUEST_PRICING_VERSION,
    estimateStatus: "estimate",
    warnings: ["Estimate only; not confirmed inventory or final booking price."],
  };
}

export function getReadyStayListingPrice(params: {
  pricingContext: "ready_stay_listing_price";
  readyStayId?: string | null;
  points?: number | null;
  guestPricePerPointCents?: number | null;
  isTestListing?: boolean | null;
  testGuestTotalCents?: number | null;
}): PixieGuestPriceEstimate {
  if (params.pricingContext !== "ready_stay_listing_price") {
    return unsupported("ready_stay_listing_price", PIXIE_READY_STAY_PRICING_SOURCE, "invalid_pricing_context");
  }
  const readyStayId = typeof params.readyStayId === "string" ? params.readyStayId.trim() : "";
  if (!readyStayId) {
    return unsupported("ready_stay_listing_price", PIXIE_READY_STAY_PRICING_SOURCE, "missing_listing");
  }
  const points = Number(params.points ?? 0);
  const ratePerPointCents = Number(params.guestPricePerPointCents ?? 0);
  if (!Number.isFinite(points) || points <= 0 || !Number.isFinite(ratePerPointCents) || ratePerPointCents < 0) {
    return unsupported("ready_stay_listing_price", PIXIE_READY_STAY_PRICING_SOURCE, "missing_points");
  }
  const confirmedListingTotalCents = getReadyStayGuestTotalCents({
    points,
    guest_price_per_point_cents: ratePerPointCents,
    is_test_listing: params.isTestListing,
    test_guest_total_cents: params.testGuestTotalCents,
  });
  if (!Number.isFinite(confirmedListingTotalCents) || confirmedListingTotalCents <= 0) {
    return unsupported("ready_stay_listing_price", PIXIE_READY_STAY_PRICING_SOURCE, "missing_listing");
  }
  return {
    supported: true,
    pricingContext: "ready_stay_listing_price",
    confirmedListingTotalCents,
    ratePerPointCents,
    currency: "USD",
    pricingCategory: "ready_stay_listing",
    source: PIXIE_READY_STAY_PRICING_SOURCE,
    sourceVersion: PIXIE_GUEST_PRICING_VERSION,
    estimateStatus: "listing_price",
    readyStayId,
    warnings: ["Ready Stay listing price is specific to this visible listing and is not a custom-request estimate."],
  };
}

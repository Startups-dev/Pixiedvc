import { RATE_BY_CATEGORY, Resorts as CalculatorResorts, TIER_DISPLAY_NAMES } from "pixiedvc-calculator";

import { getPixieResortById } from "@/lib/pixie/resorts/identifiers";
import type { PixieResortId } from "@/lib/pixie/resorts/types";
import type { PixieGuestPriceEstimate } from "@/lib/pixie/pricing/types";

export const PIXIE_GUEST_PRICING_SOURCE = "pixiedvc-calculator RATE_BY_CATEGORY with booking-window tier policy";
export const PIXIE_GUEST_PRICING_VERSION = "2026-07-10.phase2";

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  return date.toISOString().slice(0, 10) === value ? date : null;
}

function differenceInCalendarMonths(later: Date, earlier: Date) {
  return (later.getUTCFullYear() - earlier.getUTCFullYear()) * 12 + later.getUTCMonth() - earlier.getUTCMonth();
}

function unsupported(reason: Extract<PixieGuestPriceEstimate, { supported: false }>["unsupportedReason"], warnings: string[] = []): PixieGuestPriceEstimate {
  return {
    supported: false,
    currency: "USD",
    pricingSource: PIXIE_GUEST_PRICING_SOURCE,
    estimateDisclaimerKey: "pricing_unavailable",
    unsupportedReason: reason,
    warnings,
  };
}

export function estimateGuestAccommodationPrice(params: {
  resortId: PixieResortId | string | null | undefined;
  points?: number | null;
  arrivalDate?: string | null;
  bookingDate?: string | null;
}): PixieGuestPriceEstimate {
  const points = params.points;
  if (!Number.isFinite(points) || !points || points <= 0) return unsupported("missing_points");
  const resort = getPixieResortById(params.resortId);
  if (!resort) return unsupported("unknown_resort");

  const meta = CalculatorResorts.find((item) => item.code === resort.calculatorCode);
  if (!meta) return unsupported("unknown_resort");
  const arrival = params.arrivalDate ? parseDateOnly(params.arrivalDate) : null;
  const booking = params.bookingDate ? parseDateOnly(params.bookingDate) : new Date();
  if (params.arrivalDate && !arrival) return unsupported("invalid_dates");

  let pricingCategory = String(meta.category);
  if ((pricingCategory === "PREMIER_ACCESS" || pricingCategory === "PRIORITY_ACCESS") && arrival) {
    const months = differenceInCalendarMonths(arrival, booking ?? new Date());
    if (months < 7) pricingCategory = "SELECT_ACCESS";
  }
  if (pricingCategory === "PREMIUM" && arrival) {
    const months = differenceInCalendarMonths(arrival, booking ?? new Date());
    if (months < 7) pricingCategory = "REGULAR";
  }

  const rateDollars = (RATE_BY_CATEGORY as Record<string, number>)[pricingCategory];
  if (!Number.isFinite(rateDollars)) return unsupported("unsupported_pricing_category");
  const estimatedRatePerPointCents = Math.round(rateDollars * 100);
  const estimatedTotalCents = Math.round(points * estimatedRatePerPointCents);
  return {
    supported: true,
    estimatedTotalCents,
    estimatedRatePerPointCents,
    currency: "USD",
    pricingCategory: (TIER_DISPLAY_NAMES as Record<string, string>)[pricingCategory] ?? pricingCategory,
    pricingSource: PIXIE_GUEST_PRICING_SOURCE,
    estimateDisclaimerKey: "custom_request_estimate_not_confirmed",
    warnings: ["Estimate only; not confirmed inventory or final booking price."],
  };
}

import type { PixieResortId, PixieRoomTypeId } from "@/lib/pixie/resorts/types";

export type PixieCalculatorStatus = "estimated" | "unsupported" | "not_requested";
export type PixiePricingStatus = "estimated" | "unsupported" | "not_requested";
export type PixiePricingContext = "custom_request_estimate" | "ready_stay_listing_price";

export type PixieDvcPointsEstimate =
  | {
      supported: true;
      totalPoints: number;
      nightlyPoints: Array<{ night: string; points: number }>;
      calculatorYears: number[];
      resortId: PixieResortId;
      resortCalculatorCode: string;
      roomTypeId: PixieRoomTypeId;
      calculatorRoomCode: string;
      warnings: string[];
    }
  | {
      supported: false;
      totalPoints?: undefined;
      nightlyPoints: [];
      calculatorYears: number[];
      resortId?: PixieResortId;
      resortCalculatorCode?: string;
      roomTypeId?: PixieRoomTypeId;
      calculatorRoomCode?: string;
      warnings: string[];
      errorReason:
        | "invalid_dates"
        | "unsupported_year"
        | "unknown_resort"
        | "unsupported_room_type"
        | "calculator_error";
    };

export type PixieGuestPriceResult =
  | {
      supported: true;
      pricingContext: "custom_request_estimate";
      estimatedTotalCents: number;
      ratePerPointCents: number;
      currency: "USD";
      pricingCategory: string;
      source: string;
      sourceVersion: string;
      estimateStatus: "estimate";
      warnings: string[];
    }
  | {
      supported: true;
      pricingContext: "ready_stay_listing_price";
      confirmedListingTotalCents: number;
      ratePerPointCents: number;
      currency: "USD";
      pricingCategory: "ready_stay_listing";
      source: string;
      sourceVersion: string;
      estimateStatus: "listing_price";
      readyStayId: string;
      warnings: string[];
    }
  | {
      supported: false;
      pricingContext: PixiePricingContext;
      estimatedTotalCents?: undefined;
      confirmedListingTotalCents?: undefined;
      ratePerPointCents?: undefined;
      currency: "USD";
      pricingCategory?: string;
      source: string;
      sourceVersion: string;
      estimateStatus: "unsupported";
      warnings: string[];
      unsupportedReason:
        | "invalid_pricing_context"
        | "missing_points"
        | "missing_listing"
        | "unknown_resort"
        | "unsupported_pricing_category"
        | "invalid_dates"
        | "ambiguous_pricing_source";
    };

export type PixieGuestPriceEstimate = PixieGuestPriceResult;

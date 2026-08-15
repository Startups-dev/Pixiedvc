import type { PixieResortId, PixieRoomTypeId } from "@/lib/pixie/resorts/types";
import type { DvcAccommodationIdentity } from "../../../../packages/pixiedvc-calculator/src/engine/accommodations";

export type PixieCalculatorStatus = "estimated" | "unsupported" | "not_requested";
export type PixiePricingStatus = "estimated" | "unsupported" | "not_requested";
export type PixiePricingContext = "custom_request_estimate" | "ready_stay_listing_price";

export type PixieDvcPointsEstimate =
  | {
      supported: true;
      kind: "exact";
      totalPoints: number;
      nightlyPoints: Array<{ night: string; points: number }>;
      calculatorYears: number[];
      resortId: PixieResortId;
      resortCalculatorCode: string;
      roomTypeId: PixieRoomTypeId;
      calculatorRoomCode: string;
      calculatorViewCode: string;
      accommodation: DvcAccommodationIdentity;
      displayLabel: string;
      estimateStatus: "exact";
      options?: undefined;
      minPoints?: undefined;
      maxPoints?: undefined;
      totalPointsRange?: undefined;
      optionCount: 1;
      priceablePointTotal: number;
      priceablePointTotalKind: "exact";
      warnings: string[];
    }
  | {
      supported: true;
      kind: "range";
      totalPoints?: undefined;
      totalPointsRange: { min: number; max: number };
      minPoints: number;
      maxPoints: number;
      nightlyPoints: [];
      calculatorYears: number[];
      resortId: PixieResortId;
      resortCalculatorCode: string;
      roomTypeId: PixieRoomTypeId;
      calculatorRoomCode?: undefined;
      calculatorViewCode?: undefined;
      accommodation?: undefined;
      displayLabel?: undefined;
      estimateStatus: "range";
      options: Array<{
        accommodation: DvcAccommodationIdentity;
        totalPoints: number;
        nightlyPoints: Array<{ night: string; points: number }>;
        displayLabel: string;
      }>;
      optionCount: number;
      priceablePointTotal?: undefined;
      priceablePointTotalKind: "range";
      warnings: string[];
    }
  | {
      supported: false;
      kind: "unavailable";
      totalPoints?: undefined;
      totalPointsRange?: undefined;
      minPoints?: undefined;
      maxPoints?: undefined;
      nightlyPoints: [];
      calculatorYears: number[];
      resortId?: PixieResortId;
      resortCalculatorCode?: string;
      roomTypeId?: PixieRoomTypeId;
      calculatorRoomCode?: string;
      calculatorViewCode?: string;
      accommodation?: undefined;
      displayLabel?: undefined;
      estimateStatus: "unavailable";
      options?: undefined;
      optionCount?: undefined;
      priceablePointTotal?: undefined;
      priceablePointTotalKind?: undefined;
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

import type { PixieResortId, PixieRoomTypeId } from "@/lib/pixie/resorts/types";

export type PixieCalculatorStatus = "estimated" | "unsupported" | "not_requested";
export type PixiePricingStatus = "estimated" | "unsupported" | "not_requested";

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

export type PixieGuestPriceEstimate =
  | {
      supported: true;
      estimatedTotalCents: number;
      estimatedRatePerPointCents: number;
      currency: "USD";
      pricingCategory: string;
      pricingSource: string;
      estimateDisclaimerKey: "custom_request_estimate_not_confirmed";
      warnings: string[];
    }
  | {
      supported: false;
      estimatedTotalCents?: undefined;
      estimatedRatePerPointCents?: undefined;
      currency: "USD";
      pricingCategory?: string;
      pricingSource: string;
      estimateDisclaimerKey: "pricing_unavailable";
      warnings: string[];
      unsupportedReason:
        | "missing_points"
        | "unknown_resort"
        | "unsupported_pricing_category"
        | "invalid_dates";
    };

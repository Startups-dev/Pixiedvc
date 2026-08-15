import { quoteStay } from "pixiedvc-calculator";

import { getPixieResortById } from "@/lib/pixie/resorts/identifiers";
import { getCalculatorRoomCodesForRoomFamily, normalizeRoomTypeIdentifier } from "@/lib/pixie/resorts/room-types";
import type { PixieResortId } from "@/lib/pixie/resorts/types";
import type { PixieDvcPointsEstimate } from "@/lib/pixie/pricing/types";
import {
  getDvcAccommodationOption,
  getDvcAccommodationOptions,
  isValidDvcAccommodationIdentity,
} from "../../../../packages/pixiedvc-calculator/src/engine/accommodations";
import type { QuoteResult, RoomCode, ViewCode } from "../../../../packages/pixiedvc-calculator/src/engine/types";

export const PIXIE_SUPPORTED_CALCULATOR_YEARS = [2025, 2026, 2027] as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return new Date(date).toISOString().slice(0, 10) === value ? new Date(date) : null;
}

function calculateDateOnlyNights(arrivalDate?: string, departureDate?: string) {
  if (!arrivalDate || !departureDate) return undefined;
  const start = parseDateOnly(arrivalDate);
  const end = parseDateOnly(departureDate);
  if (!start || !end) return undefined;
  const nights = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  return nights > 0 ? nights : undefined;
}

function getStayYears(arrivalDate: string, nights: number) {
  const start = parseDateOnly(arrivalDate);
  if (!start) return [];
  const years = new Set<number>();
  for (let i = 0; i < nights; i += 1) {
    const cursor = new Date(start);
    cursor.setUTCDate(cursor.getUTCDate() + i);
    years.add(cursor.getUTCFullYear());
  }
  return [...years].sort();
}

function unsupported(
  base: Omit<
    Extract<PixieDvcPointsEstimate, { supported: false }>,
    "supported" | "kind" | "estimateStatus" | "nightlyPoints" | "warnings"
  > & { warnings?: string[] },
): PixieDvcPointsEstimate {
  return {
    supported: false,
    kind: "unavailable",
    estimateStatus: "unavailable",
    nightlyPoints: [],
    warnings: base.warnings ?? [],
    ...base,
  };
}

function exactEstimate(base: {
  result: QuoteResult;
  calculatorYears: number[];
  resortId: PixieResortId;
  resortCalculatorCode: string;
  roomTypeId: NonNullable<ReturnType<typeof normalizeRoomTypeIdentifier>>;
  roomCode: RoomCode;
  viewCode: ViewCode;
  displayLabel: string;
  warnings?: string[];
}): PixieDvcPointsEstimate {
  const accommodation = {
    resortCode: base.resortCalculatorCode,
    roomCode: base.roomCode,
    viewCode: base.viewCode,
  };
  return {
    supported: true,
    kind: "exact",
    estimateStatus: "exact",
    totalPoints: base.result.totalPoints,
    nightlyPoints: base.result.nightly.map((night) => ({ night: night.date, points: night.points })),
    calculatorYears: base.calculatorYears,
    resortId: base.resortId,
    resortCalculatorCode: base.resortCalculatorCode,
    roomTypeId: base.roomTypeId,
    calculatorRoomCode: base.roomCode,
    calculatorViewCode: base.viewCode,
    accommodation,
    displayLabel: base.displayLabel,
    optionCount: 1,
    priceablePointTotal: base.result.totalPoints,
    priceablePointTotalKind: "exact",
    warnings: base.warnings ?? [],
  };
}

export function estimateDvcPoints(params: {
  resortId: PixieResortId | string | null | undefined;
  roomTypeId: string | null | undefined;
  roomCode?: string | null;
  viewCode?: string | null;
  arrivalDate?: string | null;
  departureDate?: string | null;
}): PixieDvcPointsEstimate {
  const nights = calculateDateOnlyNights(params.arrivalDate ?? undefined, params.departureDate ?? undefined);
  if (!params.arrivalDate || !params.departureDate || !nights) {
    return unsupported({ errorReason: "invalid_dates", calculatorYears: [] });
  }

  const years = getStayYears(params.arrivalDate, nights);
  const unsupportedYears = years.filter((year) => !PIXIE_SUPPORTED_CALCULATOR_YEARS.includes(year as never));
  if (unsupportedYears.length) {
    return unsupported({
      errorReason: "unsupported_year",
      calculatorYears: years,
      warnings: [`Unsupported calculator year(s): ${unsupportedYears.join(", ")}.`],
    });
  }

  const resort = getPixieResortById(params.resortId);
  if (!resort) {
    return unsupported({ errorReason: "unknown_resort", calculatorYears: years });
  }

  const roomTypeId = normalizeRoomTypeIdentifier(params.roomTypeId);
  if (!roomTypeId) {
    return unsupported({
      errorReason: "unsupported_room_type",
      calculatorYears: years,
      resortId: resort.id,
      resortCalculatorCode: resort.calculatorCode,
    });
  }

  const exactRoomCode = typeof params.roomCode === "string" ? params.roomCode.trim().toUpperCase() : "";
  const exactViewCode = typeof params.viewCode === "string" ? params.viewCode.trim().toUpperCase() : "";
  if (exactRoomCode || exactViewCode) {
    if (
      !exactRoomCode ||
      !exactViewCode ||
      !isValidDvcAccommodationIdentity({
        resortCode: resort.calculatorCode,
        roomCode: exactRoomCode as RoomCode,
        viewCode: exactViewCode as ViewCode,
      })
    ) {
      return unsupported({
        errorReason: "unsupported_room_type",
        calculatorYears: years,
        resortId: resort.id,
        resortCalculatorCode: resort.calculatorCode,
        roomTypeId,
        calculatorRoomCode: exactRoomCode || undefined,
        calculatorViewCode: exactViewCode || undefined,
        warnings: ["Exact room/category identity is not valid for this resort."],
      });
    }

    try {
      const result = quoteStay({
        resortCode: resort.calculatorCode,
        room: exactRoomCode as RoomCode,
        view: exactViewCode as ViewCode,
        checkIn: params.arrivalDate,
        nights,
      });
      const option = getDvcAccommodationOption({
        resortCode: resort.calculatorCode,
        roomCode: exactRoomCode as RoomCode,
        viewCode: exactViewCode as ViewCode,
      });
      return exactEstimate({
        result,
        calculatorYears: years,
        resortId: resort.id,
        resortCalculatorCode: resort.calculatorCode,
        roomTypeId,
        roomCode: exactRoomCode as RoomCode,
        viewCode: exactViewCode as ViewCode,
        displayLabel: option?.displayLabel ?? `${exactRoomCode} - ${exactViewCode}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to calculate points.";
      return unsupported({
        errorReason: "calculator_error",
        calculatorYears: years,
        resortId: resort.id,
        resortCalculatorCode: resort.calculatorCode,
        roomTypeId,
        calculatorRoomCode: exactRoomCode,
        calculatorViewCode: exactViewCode,
        warnings: [message],
      });
    }
  }

  const calculatorRoomCodes = Array.from(new Set(getCalculatorRoomCodesForRoomFamily(resort, roomTypeId)));
  if (!calculatorRoomCodes.length) {
    return unsupported({
      errorReason: "unsupported_room_type",
      calculatorYears: years,
      resortId: resort.id,
      resortCalculatorCode: resort.calculatorCode,
      roomTypeId,
    });
  }

  try {
    const options = getDvcAccommodationOptions(resort.calculatorCode).filter((option) =>
      calculatorRoomCodes.includes(option.roomCode),
    );
    if (!options.length) {
      return unsupported({
        errorReason: "unsupported_room_type",
        calculatorYears: years,
        resortId: resort.id,
        resortCalculatorCode: resort.calculatorCode,
        roomTypeId,
        warnings: ["No calculator accommodation mapping exists for this room type."],
      });
    }

    const quotedOptions = options
      .map((option) => {
        const result = quoteStay({
          resortCode: option.resortCode,
          room: option.roomCode,
          view: option.viewCode,
          checkIn: params.arrivalDate,
          nights,
        });
        return {
          accommodation: {
            resortCode: option.resortCode,
            roomCode: option.roomCode,
            viewCode: option.viewCode,
          },
          totalPoints: result.totalPoints,
          nightlyPoints: result.nightly.map((night) => ({ night: night.date, points: night.points })),
          displayLabel: option.displayLabel,
        };
      })
      .sort((a, b) => a.totalPoints - b.totalPoints || a.displayLabel.localeCompare(b.displayLabel));

    if (quotedOptions.length === 1) {
      const [option] = quotedOptions;
      const result = quoteStay({
        resortCode: option.accommodation.resortCode,
        room: option.accommodation.roomCode,
        view: option.accommodation.viewCode,
        checkIn: params.arrivalDate,
        nights,
      });
      return exactEstimate({
        result,
        calculatorYears: years,
        resortId: resort.id,
        resortCalculatorCode: resort.calculatorCode,
        roomTypeId,
        roomCode: option.accommodation.roomCode,
        viewCode: option.accommodation.viewCode,
        displayLabel: option.displayLabel,
      });
    }

    const totals = quotedOptions.map((option) => option.totalPoints);
    const minPoints = Math.min(...totals);
    const maxPoints = Math.max(...totals);
    return {
      supported: true,
      kind: "range",
      estimateStatus: "range",
      totalPointsRange: { min: minPoints, max: maxPoints },
      minPoints,
      maxPoints,
      nightlyPoints: [],
      calculatorYears: years,
      resortId: resort.id,
      resortCalculatorCode: resort.calculatorCode,
      roomTypeId,
      options: quotedOptions,
      optionCount: quotedOptions.length,
      priceablePointTotalKind: "range",
      warnings: ["Planning range only; exact points depend on room category."],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate points.";
    return unsupported({
      errorReason: "calculator_error",
      calculatorYears: years,
      resortId: resort.id,
      resortCalculatorCode: resort.calculatorCode,
      roomTypeId,
      warnings: [message],
    });
  }
}

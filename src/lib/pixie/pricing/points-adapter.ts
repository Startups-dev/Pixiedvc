import { quoteStay, Resorts as CalculatorResorts } from "pixiedvc-calculator";

import { calculateDateOnlyNights } from "@/lib/pixie/planner-state";
import { getPixieResortById } from "@/lib/pixie/resorts/identifiers";
import { getCalculatorRoomCodeForRoomType, normalizeRoomTypeIdentifier } from "@/lib/pixie/resorts/room-types";
import type { PixieResortId } from "@/lib/pixie/resorts/types";
import type { PixieDvcPointsEstimate } from "@/lib/pixie/pricing/types";

export const PIXIE_SUPPORTED_CALCULATOR_YEARS = [2025, 2026, 2027] as const;

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return new Date(date).toISOString().slice(0, 10) === value ? new Date(date) : null;
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

function unsupported(base: Omit<Extract<PixieDvcPointsEstimate, { supported: false }>, "supported" | "nightlyPoints" | "warnings"> & { warnings?: string[] }): PixieDvcPointsEstimate {
  return { supported: false, nightlyPoints: [], warnings: base.warnings ?? [], ...base };
}

export function estimateDvcPoints(params: {
  resortId: PixieResortId | string | null | undefined;
  roomTypeId: string | null | undefined;
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
    return unsupported({ errorReason: "unsupported_room_type", calculatorYears: years, resortId: resort.id, resortCalculatorCode: resort.calculatorCode });
  }

  const calculatorRoomCode = getCalculatorRoomCodeForRoomType(resort, roomTypeId);
  if (!calculatorRoomCode) {
    return unsupported({
      errorReason: "unsupported_room_type",
      calculatorYears: years,
      resortId: resort.id,
      resortCalculatorCode: resort.calculatorCode,
      roomTypeId,
    });
  }

  try {
    const room = resort.roomTypes.find((candidate) => candidate.id === roomTypeId && candidate.calculatorRoomCode === calculatorRoomCode);
    const calculatorMeta = CalculatorResorts.find((item) => item.code === resort.calculatorCode);
    const view = calculatorMeta?.viewsByRoom[calculatorRoomCode as never]?.[0];
    if (!view) {
      return unsupported({
        errorReason: "unsupported_room_type",
        calculatorYears: years,
        resortId: resort.id,
        resortCalculatorCode: resort.calculatorCode,
        roomTypeId,
        calculatorRoomCode,
        warnings: ["No calculator view mapping exists for this room type."],
      });
    }
    const result = quoteStay({
      resortCode: resort.calculatorCode,
      room: calculatorRoomCode as never,
      view: view as never,
      checkIn: params.arrivalDate,
      nights,
    });

    return {
      supported: true,
      totalPoints: result.totalPoints,
      nightlyPoints: result.nightly.map((night) => ({ night: night.date, points: night.points })),
      calculatorYears: years,
      resortId: resort.id,
      resortCalculatorCode: resort.calculatorCode,
      roomTypeId: room?.id ?? roomTypeId,
      calculatorRoomCode,
      warnings: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate points.";
    return unsupported({
      errorReason: "calculator_error",
      calculatorYears: years,
      resortId: resort.id,
      resortCalculatorCode: resort.calculatorCode,
      roomTypeId,
      calculatorRoomCode,
      warnings: [message],
    });
  }
}

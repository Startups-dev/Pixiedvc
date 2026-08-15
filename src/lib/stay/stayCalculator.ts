import {
  getDvcAccommodationOption,
  getDvcAccommodationOptions,
} from "../../../packages/pixiedvc-calculator/src/engine/accommodations";
import { quoteStay } from "../../../packages/pixiedvc-calculator/src/engine/calc";
import type {
  DvcAccommodationOption,
} from "../../../packages/pixiedvc-calculator/src/engine/accommodations";
import type {
  RoomCode,
  ViewCode,
} from "../../../packages/pixiedvc-calculator/src/engine/types";

export type StayCalculatorInput = {
  resortCalculatorCode?: string | null;
  resortCode?: string | null;
  roomType?: string | null;
  roomCode?: RoomCode | string | null;
  viewCode?: ViewCode | string | null;
  checkIn: string;
  checkOut: string;
};

export type StayCalculatorErrorCode =
  | "unsupported_resort"
  | "invalid_accommodation"
  | "ambiguous_accommodation"
  | "invalid_dates";

export class StayCalculatorError extends Error {
  readonly code: StayCalculatorErrorCode;

  constructor(code: StayCalculatorErrorCode, message: string) {
    super(message);
    this.name = "StayCalculatorError";
    this.code = code;
  }
}

export type NightPointsRow = {
  night: string;
  points: number;
};

export type StayCalculatorResult = {
  nights: NightPointsRow[];
  totalNights: number;
  totalPoints: number;
};

function parseYmdToUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getNightDates(checkIn: string, checkOut: string) {
  const start = parseYmdToUtcDate(checkIn);
  const end = parseYmdToUtcDate(checkOut);

  if (Number.isNaN(start.getTime())) {
    throw new StayCalculatorError("invalid_dates", "Invalid check-in date.");
  }

  if (Number.isNaN(end.getTime()) || end <= start) {
    return [formatUtcDate(start)];
  }

  const nights: string[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    nights.push(formatUtcDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return nights.length > 0 ? nights : [formatUtcDate(start)];
}

function normalizeRoomType(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeViewCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getRoomCandidates(roomType: string): RoomCode[] {
  const normalized = normalizeRoomType(roomType);

  const aliasMap: Record<string, RoomCode[]> = {
    STUDIO: [
      "STUDIO",
      "DELUXESTUDIO",
      "DUOSTUDIO",
      "TOWERSTUDIO",
      "RESORTSTUDIO",
      "GARDENDELUXESTUDIO",
      "GARDENDUOSTUDIO",
      "INNROOM",
    ],
    "1BEDROOM": ["ONEBR"],
    ONEBEDROOM: ["ONEBR"],
    "2BEDROOM": ["TWOBR", "TWOBRBUNGALOW", "TREEHOUSE"],
    TWOBEDROOM: ["TWOBR", "TWOBRBUNGALOW", "TREEHOUSE"],
    "3BEDROOM": ["GRANDVILLA", "COTTAGE", "PENTHOUSE"],
    THREEBEDROOM: ["GRANDVILLA", "COTTAGE", "PENTHOUSE"],
    GRANDVILLA: ["GRANDVILLA"],
    CABIN: ["CABIN"],
  };

  if (aliasMap[normalized]) {
    return aliasMap[normalized];
  }

  const direct = normalized as RoomCode;
  return [direct];
}

function getResortOptions(resortCalculatorCode: string) {
  const options = getDvcAccommodationOptions(resortCalculatorCode);
  if (options.length === 0) {
    throw new StayCalculatorError("unsupported_resort", "Points charts missing for selected resort.");
  }
  return options;
}

function resolveExactAccommodation(
  resortCalculatorCode: string,
  roomCode: string,
  viewCode: string,
): DvcAccommodationOption {
  getResortOptions(resortCalculatorCode);

  const option = getDvcAccommodationOption({
    resortCode: resortCalculatorCode,
    roomCode: normalizeRoomType(roomCode) as RoomCode,
    viewCode: normalizeViewCode(viewCode) as ViewCode,
  });

  if (!option) {
    throw new StayCalculatorError(
      "invalid_accommodation",
      "Room category is not valid for selected resort.",
    );
  }

  return option;
}

function resolveLegacyAccommodation(resortCalculatorCode: string, roomType: string): DvcAccommodationOption {
  const options = getResortOptions(resortCalculatorCode);
  const candidates = new Set(getRoomCandidates(roomType));
  const matches = options.filter((option) => candidates.has(option.roomCode));

  if (matches.length === 0) {
    throw new StayCalculatorError(
      "invalid_accommodation",
      "Points charts missing for selected room type.",
    );
  }

  if (matches.length > 1) {
    throw new StayCalculatorError(
      "ambiguous_accommodation",
      "Room category is required for this resort and room type.",
    );
  }

  return matches[0]!;
}

function resolveAccommodation(input: {
  resortCalculatorCode: string;
  roomType: string;
  roomCode: string;
  viewCode: string;
}) {
  if (input.roomCode || input.viewCode) {
    if (!input.roomCode || !input.viewCode) {
      throw new StayCalculatorError(
        "invalid_accommodation",
        "Room code and view code are required for an exact points quote.",
      );
    }
    return resolveExactAccommodation(input.resortCalculatorCode, input.roomCode, input.viewCode);
  }

  if (!input.roomType) {
    throw new StayCalculatorError(
      "invalid_accommodation",
      "Room category is required for points quote.",
    );
  }

  return resolveLegacyAccommodation(input.resortCalculatorCode, input.roomType);
}

export function calculateStayPoints(input: StayCalculatorInput): StayCalculatorResult {
  const resortCalculatorCode = (input.resortCalculatorCode ?? input.resortCode)?.trim() ?? "";
  const roomType = input.roomType?.trim() ?? "";
  const roomCode = input.roomCode?.trim() ?? "";
  const viewCode = input.viewCode?.trim() ?? "";
  const checkIn = input.checkIn?.trim() ?? "";
  const checkOut = input.checkOut?.trim() ?? "";

  if (!resortCalculatorCode) {
    throw new StayCalculatorError("unsupported_resort", "Resort is required for points quote.");
  }
  if (!checkIn) {
    throw new StayCalculatorError("invalid_dates", "Check-in is required for points quote.");
  }

  const nights = getNightDates(checkIn, checkOut);
  const accommodation = resolveAccommodation({
    resortCalculatorCode,
    roomType,
    roomCode,
    viewCode,
  });

  let quote;
  try {
    quote = quoteStay({
      resortCode: accommodation.resortCode,
      room: accommodation.roomCode,
      view: accommodation.viewCode,
      checkIn,
      nights: nights.length,
    });
  } catch {
    throw new StayCalculatorError(
      "invalid_accommodation",
      "Points charts missing for selected stay details.",
    );
  }

  return {
    nights: quote.nightly.map((night) => ({ night: night.date, points: night.points })),
    totalNights: quote.nightly.length,
    totalPoints: quote.totalPoints,
  };
}

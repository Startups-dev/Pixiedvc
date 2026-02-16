import { quoteStay, Resorts as CalculatorResorts } from "pixiedvc-calculator";
import type { RoomCode, ViewCode } from "pixiedvc-calculator";

export type StayCalculatorInput = {
  resortCalculatorCode: string | null;
  roomType: string;
  checkIn: string;
  checkOut: string;
};

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
    throw new Error("Invalid check-in date.");
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

function resolveRoomAndView(resortCalculatorCode: string, roomType: string) {
  const resort = CalculatorResorts.find(
    (item) => item.code.toUpperCase() === resortCalculatorCode.toUpperCase(),
  );

  if (!resort) {
    throw new Error("Points charts missing for selected resort.");
  }

  const candidates = getRoomCandidates(roomType);
  const room = candidates.find((candidate) => resort.roomTypes.includes(candidate));

  if (!room) {
    throw new Error("Points charts missing for selected room type.");
  }

  const firstView = (resort.viewsByRoom[room]?.[0] ?? "S") as ViewCode;
  return { room, view: firstView };
}

export function calculateStayPoints(input: StayCalculatorInput): StayCalculatorResult {
  const resortCalculatorCode = input.resortCalculatorCode?.trim() ?? "";
  const roomType = input.roomType?.trim() ?? "";
  const checkIn = input.checkIn?.trim() ?? "";
  const checkOut = input.checkOut?.trim() ?? "";

  if (!resortCalculatorCode) {
    throw new Error("Resort is required for points quote.");
  }
  if (!roomType) {
    throw new Error("Room type is required for points quote.");
  }
  if (!checkIn) {
    throw new Error("Check-in is required for points quote.");
  }

  const nights = getNightDates(checkIn, checkOut);
  const { room, view } = resolveRoomAndView(resortCalculatorCode, roomType);

  let quote;
  try {
    quote = quoteStay({
      resortCode: resortCalculatorCode,
      room,
      view,
      checkIn,
      nights: nights.length,
    });
  } catch {
    throw new Error("Points charts missing for selected stay details.");
  }

  return {
    nights: quote.nightly.map((night) => ({ night: night.date, points: night.points })),
    totalNights: quote.nightly.length,
    totalPoints: quote.totalPoints,
  };
}

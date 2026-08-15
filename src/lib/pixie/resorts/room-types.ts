import { Resorts as CalculatorResorts } from "pixiedvc-calculator";

import type { PixieRoomType, PixieRoomTypeId, PixieResortCatalogItem, PixieResortId } from "@/lib/pixie/resorts/types";
import type { PixieTripState } from "@/lib/pixie/schema";

type CalculatorRoomCode = (typeof CalculatorResorts)[number]["roomTypes"][number];

const ROOM_CODE_TO_ID: Record<string, PixieRoomTypeId> = {
  STUDIO: "studio",
  DUOSTUDIO: "duo_studio",
  TOWERSTUDIO: "tower_studio",
  DELUXESTUDIO: "deluxe_studio",
  RESORTSTUDIO: "resort_studio",
  ONEBR: "one_bedroom",
  TWOBR: "two_bedroom",
  GRANDVILLA: "three_bedroom_grand_villa",
  TWOBRBUNGALOW: "bungalow",
  CABIN: "cabin",
  TREEHOUSE: "treehouse",
  PENTHOUSE: "penthouse",
};

const ROOM_LABELS: Record<PixieRoomTypeId, string> = {
  studio: "Deluxe Studio",
  duo_studio: "Duo Studio",
  tower_studio: "Tower Studio",
  deluxe_studio: "Deluxe Studio",
  resort_studio: "Resort Studio",
  one_bedroom: "1 Bedroom Villa",
  two_bedroom: "2 Bedroom Villa",
  three_bedroom_grand_villa: "3 Bedroom Grand Villa",
  bungalow: "Bungalow",
  cabin: "Cabin",
  treehouse: "Treehouse Villa",
  penthouse: "Penthouse",
};

function roomDetails(id: PixieRoomTypeId) {
  if (id === "studio" || id === "deluxe_studio" || id === "tower_studio" || id === "duo_studio" || id === "resort_studio") {
    return {
      bedroomCount: 0,
      kitchenLevel: "kitchenette" as const,
      laundryAvailability: "shared" as const,
    };
  }
  if (id === "one_bedroom") {
    return { bedroomCount: 1, kitchenLevel: "full" as const, laundryAvailability: "in_room" as const };
  }
  if (id === "two_bedroom" || id === "bungalow" || id === "cabin" || id === "treehouse") {
    return { bedroomCount: 2, kitchenLevel: "full" as const, laundryAvailability: "in_room" as const };
  }
  return { bedroomCount: 3, kitchenLevel: "full" as const, laundryAvailability: "in_room" as const };
}

export function normalizeRoomTypeIdentifier(input: string | null | undefined): PixieRoomTypeId | null {
  const normalized = (input ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!normalized) return null;
  const compact = normalized.replace(/_/g, "");
  const aliases: Record<string, PixieRoomTypeId> = {
    studio: "studio",
    deluxestudio: "deluxe_studio",
    duostudio: "duo_studio",
    towerstudio: "tower_studio",
    resortstudio: "resort_studio",
    "1bedroom": "one_bedroom",
    onebedroom: "one_bedroom",
    onebr: "one_bedroom",
    "2bedroom": "two_bedroom",
    twobedroom: "two_bedroom",
    twobr: "two_bedroom",
    "3bedroom": "three_bedroom_grand_villa",
    threebedroom: "three_bedroom_grand_villa",
    grandvilla: "three_bedroom_grand_villa",
    bungalow: "bungalow",
    cabin: "cabin",
    treehouse: "treehouse",
    penthouse: "penthouse",
  };
  return aliases[normalized] ?? aliases[compact] ?? null;
}

export function roomTypeFromCalculatorCode(calculatorRoomCode: string, capacity: number | undefined): PixieRoomType | null {
  const id = ROOM_CODE_TO_ID[calculatorRoomCode];
  if (!id || typeof capacity !== "number" || !Number.isFinite(capacity) || capacity <= 0) return null;
  const details = roomDetails(id);
  return {
    id,
    calculatorRoomCode,
    displayName: ROOM_LABELS[id],
    standardCapacity: capacity,
    maximumCapacity: capacity,
    ...details,
    calculatorSupported: true,
  };
}

export function getCalculatorRoomCodeForRoomType(resort: PixieResortCatalogItem, roomTypeId: PixieRoomTypeId) {
  return resort.roomTypes.find((room) => room.id === roomTypeId)?.calculatorRoomCode ?? null;
}

export function getCalculatorRoomCodesForRoomFamily(resort: PixieResortCatalogItem, roomTypeId: PixieRoomTypeId) {
  if (roomTypeId !== "studio") {
    return resort.roomTypes
      .filter((room) => room.id === roomTypeId)
      .map((room) => room.calculatorRoomCode);
  }

  return resort.roomTypes
    .filter(
      (room) =>
        room.calculatorSupported &&
        room.bedroomCount === 0 &&
        room.kitchenLevel === "kitchenette",
    )
    .map((room) => room.calculatorRoomCode);
}

export function getRoomTypesForResort(resort: PixieResortCatalogItem | null | undefined) {
  return resort?.roomTypes.filter((room) => room.calculatorSupported) ?? [];
}

export function getPartySize(party: PixieTripState["party"]) {
  return party.totalPartySize ?? (party.adults ?? 0) + (party.children ?? 0);
}

export function canRoomAccommodateParty(roomType: PixieRoomType, party: PixieTripState["party"]) {
  const partySize = getPartySize(party);
  if (partySize <= 0) return false;
  return roomType.maximumCapacity >= partySize;
}

export function getEligibleRoomTypes(resort: PixieResortCatalogItem, party: PixieTripState["party"]) {
  return getRoomTypesForResort(resort).filter((roomType) => canRoomAccommodateParty(roomType, party));
}

export function selectSmallestEligibleRoomType(resort: PixieResortCatalogItem, party: PixieTripState["party"]) {
  return [...getEligibleRoomTypes(resort, party)].sort((a, b) => {
    if (a.maximumCapacity !== b.maximumCapacity) return a.maximumCapacity - b.maximumCapacity;
    return a.displayName.localeCompare(b.displayName);
  })[0] ?? null;
}

export function buildRoomTypesFromCalculator(resortId: PixieResortId, calculatorCode: string) {
  const meta = CalculatorResorts.find((item) => item.code === calculatorCode);
  if (!meta) return [];
  return meta.roomTypes
    .map((roomCode: CalculatorRoomCode) => {
      const room = roomTypeFromCalculatorCode(roomCode, meta.occupancy?.[roomCode]);
      if (!room) return null;
      if (resortId === "pvb" && room.id === "studio" && room.calculatorRoomCode === "STUDIO") {
        return { ...room, notes: "Legacy Polynesian studio code; prefer specific duo or deluxe studio where possible." };
      }
      return room;
    })
    .filter((room): room is PixieRoomType => Boolean(room));
}

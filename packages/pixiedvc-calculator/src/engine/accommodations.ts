import { Resorts } from "./charts";
import type { ResortMeta, RoomCode, ViewCode } from "./types";

export type DvcAccommodationIdentity = {
  resortCode: string;
  roomCode: RoomCode;
  viewCode: ViewCode;
};

export type DvcAccommodationOption = DvcAccommodationIdentity & {
  roomLabel: string;
  categoryLabel: string;
  displayLabel: string;
};

export function dvcAccommodationIdentityKey(identity: DvcAccommodationIdentity) {
  return `${identity.resortCode}:${identity.roomCode}:${identity.viewCode}`;
}

function normalizeResortCode(resortCode: string) {
  return resortCode.trim().toUpperCase();
}

function getResortMeta(resortCode: string, resorts: ResortMeta[] = Resorts) {
  const normalized = normalizeResortCode(resortCode);
  return resorts.find((resort) => resort.code.toUpperCase() === normalized) ?? null;
}

export function formatDvcRoomLabel(roomCode: RoomCode) {
  switch (roomCode) {
    case "STUDIO":
      return "Deluxe Studio";
    case "RESORTSTUDIO":
      return "Resort Studio";
    case "TOWERSTUDIO":
      return "Tower Studio";
    case "DUOSTUDIO":
      return "Duo Studio";
    case "DELUXESTUDIO":
      return "Deluxe Studio";
    case "GARDENDUOSTUDIO":
      return "Garden Room Duo Studio";
    case "GARDENDELUXESTUDIO":
      return "Garden Room Deluxe Studio";
    case "CABIN":
      return "Cabin";
    case "ONEBR":
      return "One Bedroom";
    case "TWOBR":
      return "Two Bedroom";
    case "TWOBRBUNGALOW":
      return "Two-Bedroom Bungalow";
    case "PENTHOUSE":
      return "Two-Bedroom Penthouse Villa";
    case "GRANDVILLA":
      return "Grand Villa";
    case "TREEHOUSE":
      return "Three-Bedroom Treehouse Villa";
    case "INNROOM":
      return "Deluxe Inn Room";
    case "COTTAGE":
      return "Three-Bedroom Beach Cottage";
    default:
      return roomCode;
  }
}

function buildOption(resort: ResortMeta, roomCode: RoomCode, viewCode: ViewCode): DvcAccommodationOption {
  const roomLabel = formatDvcRoomLabel(roomCode);
  const categoryLabel = resort.viewNames[viewCode] ?? `Category ${viewCode}`;
  return {
    resortCode: resort.code,
    roomCode,
    viewCode,
    roomLabel,
    categoryLabel,
    displayLabel: `${roomLabel} - ${categoryLabel}`,
  };
}

export function getDvcAccommodationOptions(resortCode: string, resorts: ResortMeta[] = Resorts): DvcAccommodationOption[] {
  const resort = getResortMeta(resortCode, resorts);
  if (!resort) return [];

  const options: DvcAccommodationOption[] = [];
  for (const roomCode of resort.roomTypes) {
    const viewCodes = resort.viewsByRoom[roomCode] ?? [];
    for (const viewCode of viewCodes) {
      options.push(buildOption(resort, roomCode, viewCode));
    }
  }
  return options;
}

export function getDvcAccommodationOption(
  identity: DvcAccommodationIdentity,
  resorts: ResortMeta[] = Resorts,
): DvcAccommodationOption | null {
  return (
    getDvcAccommodationOptions(identity.resortCode, resorts).find(
      (option) => option.roomCode === identity.roomCode && option.viewCode === identity.viewCode,
    ) ?? null
  );
}

export function isValidDvcAccommodationIdentity(identity: DvcAccommodationIdentity, resorts: ResortMeta[] = Resorts) {
  return getDvcAccommodationOption(identity, resorts) !== null;
}

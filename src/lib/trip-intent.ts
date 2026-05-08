export type TripIntent = {
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  resort?: string;
  adults?: number;
  children?: number;
  room?: string;
  view?: string;
};

type SearchParamsLike =
  | URLSearchParams
  | {
      get?: (key: string) => string | null;
      [key: string]: string | string[] | undefined | ((key: string) => string | null);
    };

const TRIP_INTENT_SESSION_KEY = "pixiedvc.trip-intent.v1";

function readParam(searchParams: SearchParamsLike | null | undefined, key: string) {
  if (!searchParams) return null;
  if (typeof (searchParams as URLSearchParams).get === "function") {
    return (searchParams as URLSearchParams).get(key);
  }
  const value = (searchParams as Record<string, string | string[] | undefined>)[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === "string" ? value : null;
}

function cleanString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function diffNights(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return undefined;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : undefined;
}

export function mergeTripIntent(existing: TripIntent, updates: TripIntent) {
  const merged: TripIntent = { ...existing };

  for (const [key, value] of Object.entries(updates) as Array<[keyof TripIntent, TripIntent[keyof TripIntent]]>) {
    if (value === undefined || value === null || value === "") {
      delete merged[key];
      continue;
    }
    merged[key] = value as never;
  }

  if (!merged.nights) {
    const derivedNights = diffNights(merged.checkIn, merged.checkOut);
    if (derivedNights) merged.nights = derivedNights;
  }

  return merged;
}

export function parseTripIntentFromSearchParams(searchParams: SearchParamsLike | null | undefined): TripIntent {
  const checkIn = cleanString(readParam(searchParams, "checkIn"));
  const checkOut = cleanString(readParam(searchParams, "checkOut"));
  const parsed: TripIntent = {
    checkIn,
    checkOut,
    nights: cleanNumber(readParam(searchParams, "nights")) ?? diffNights(checkIn, checkOut),
    resort: cleanString(readParam(searchParams, "resort")),
    adults: cleanNumber(readParam(searchParams, "adults")),
    children: cleanNumber(readParam(searchParams, "children")),
    room: cleanString(readParam(searchParams, "room")),
    view: cleanString(readParam(searchParams, "view")),
  };

  return parsed;
}

export function buildTripIntentQuery(intent: TripIntent) {
  const params = new URLSearchParams();
  if (intent.checkIn) params.set("checkIn", intent.checkIn);
  if (intent.checkOut) params.set("checkOut", intent.checkOut);
  if (intent.nights) params.set("nights", String(intent.nights));
  if (intent.resort) params.set("resort", intent.resort);
  if (typeof intent.adults === "number") params.set("adults", String(intent.adults));
  if (typeof intent.children === "number") params.set("children", String(intent.children));
  if (intent.room) params.set("room", intent.room);
  if (intent.view) params.set("view", intent.view);
  return params;
}

export function saveTripIntentToSession(intent: TripIntent) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TRIP_INTENT_SESSION_KEY, JSON.stringify(intent));
  } catch {
    // ignore
  }
}

export function loadTripIntentFromSession(): TripIntent {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(TRIP_INTENT_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TripIntent;
    return mergeTripIntent({}, parsed ?? {});
  } catch {
    return {};
  }
}

export function hasTripIntent(intent: TripIntent) {
  return Boolean(
    intent.checkIn ||
      intent.checkOut ||
      intent.nights ||
      intent.resort ||
      typeof intent.adults === "number" ||
      typeof intent.children === "number" ||
      intent.room ||
      intent.view,
  );
}

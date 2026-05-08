// src/ui/DvcCalculator.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDownIcon,
  HomeIcon,
  InformationCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Resorts } from "../engine/charts";
import { quoteStay } from "../engine/calc";
import type { RoomCode, ViewCode } from "../engine/types";
import { ResultsTable } from "./ResultsTable";
import { resolveResortImage } from "@/lib/resort-image";

const DVC_CALC_DRAFT_KEY = "pixiedvc:dvcCalcDraft:v1";
const QUOTE_KEY_PREFIX = "pixiedvc:quote:";
const TRIP_INTENT_SESSION_KEY = "pixiedvc.trip-intent.v1";
const MAX_PRICING_DATE = "2027-12-31";
const LATEST_CHECK_IN_DATE = "2027-12-30";
const INVALID_RANGE_MESSAGE = "Select dates between today and Dec 31, 2027.";
const MAX_PRICING_MESSAGE = "Pricing is available through Dec 31, 2027.";
const PRICING_TIER_DETAILS = [
  {
    name: "Premier Access",
    rate: "$29/pt",
    description:
      "Highest-demand villa access when select resorts are secured further in advance.",
  },
  {
    name: "Priority Access",
    rate: "$26/pt",
    description:
      "Preferred pricing tier for premium resorts with stronger booking-window demand.",
  },
  {
    name: "Select Access",
    rate: "$24/pt",
    description:
      "Balanced pricing across many deluxe villa stays and shorter-window premium requests.",
  },
  {
    name: "Value Access",
    rate: "$22/pt",
    description:
      "Lower-priced access at select resorts that typically offer more flexible availability.",
  },
] as const;
const RESORT_SLUG_TO_CODE: Record<string, string> = {
  "animal-kingdom-villas": "AKV",
  "animal-kingdom-jambo": "AKV",
  "animal-kingdom-kidani": "AKV",
  aulani: "AUL",
  "bay-lake-tower": "BLT",
  "beach-club-villas": "BCV",
  "boardwalk-villas": "BWV",
  "boulder-ridge-villas": "BRV",
  "copper-creek-villas": "CCV",
  "copper-creek-villas-and-cabins": "CCV",
  "disneyland-hotel-villas": "VDH",
  "villas-at-disneyland-hotel": "VDH",
  "grand-californian-villas": "VGC",
  "grand-floridian-villas": "VGF",
  "hilton-head-island": "HHI",
  "old-key-west": "OKW",
  "polynesian-villas": "PVB",
  "polynesian-villas-and-bungalows": "PVB",
  "riviera-resort": "RVA",
  "saratoga-springs": "SSR",
  "vero-beach": "VB",
  "vero-beach-resort": "VB",
  "disneys-riviera-resort": "RVA",
  "the-villas-at-disneys-grand-californian-hotel-spa": "VGC",
  "the-villas-at-disneyland-hotel": "VDH",
  "disneys-polynesian-villas-and-bungalows": "PVB",
  "the-villas-at-disneys-grand-floridian-resort-spa": "VGF",
  "disneys-hilton-head-island-resort": "HHI",
  "disneys-vero-beach-resort": "VB",
};
const RESORT_CODE_TO_SLUG: Record<string, string> = {
  AKV: "animal-kingdom-villas",
  AUL: "aulani",
  BLT: "bay-lake-tower",
  BCV: "beach-club-villas",
  BWV: "boardwalk-villas",
  BRV: "boulder-ridge-villas",
  CCV: "copper-creek-villas-and-cabins",
  VDH: "disneyland-hotel-villas",
  VGC: "grand-californian-villas",
  VGF: "grand-floridian-villas",
  HHI: "hilton-head-island",
  OKW: "old-key-west",
  PVB: "polynesian-villas",
  RVA: "riviera-resort",
  SSR: "saratoga-springs",
  VB: "vero-beach",
};
const SUMMARY_IMAGE_OVERRIDE_BY_CODE: Record<string, string> = {
  CCV:
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Copper-creek-villas-and-cabins/CCV1.png",
};

const SUMMARY_IMAGE_FALLBACK_BY_CODE: Record<string, string> = {
  CCV: "/images/Fort wilderness.png",
};

const DEFAULT_SUMMARY_IMAGE = resolveResortImage({ resortCode: "SSR", imageIndex: 1 }).url;

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function resolveResortCodeFromParam(param: string | null | undefined) {
  const normalized = param?.toLowerCase().trim();
  if (!normalized) return null;

  const codeMatch = Resorts.find((res) => res.code.toLowerCase() === normalized);
  if (codeMatch) return codeMatch.code;

  const slugCode = RESORT_SLUG_TO_CODE[normalized];
  if (slugCode && Resorts.some((res) => res.code === slugCode)) {
    return slugCode;
  }

  const nameMatch = Resorts.find((res) => slugify(res.name) === normalized);
  return nameMatch?.code ?? null;
}

type DvcCalcDraft = {
  mode: "single" | "compare";
  checkIn: string;
  nights: number;
  resort: string;
  room: RoomCode;
  view: ViewCode;
  result?: {
    totalPoints: number;
    totalUSD: number;
    pppUSD: number;
    pricingTier: string;
  };
  updatedAt: number;
};

type TripIntent = {
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  resort?: string;
  adults?: number;
  children?: number;
  room?: string;
  view?: string;
};

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

function mergeTripIntent(existing: TripIntent, updates: TripIntent) {
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

function hasTripIntent(intent: TripIntent) {
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

function parseTripIntentFromParams(params: URLSearchParams): TripIntent {
  const checkIn = cleanString(params.get("checkIn"));
  const checkOut = cleanString(params.get("checkOut"));

  return {
    checkIn,
    checkOut,
    nights: cleanNumber(params.get("nights")) ?? diffNights(checkIn, checkOut),
    resort: cleanString(params.get("resort")),
    adults: cleanNumber(params.get("adults")),
    children: cleanNumber(params.get("children")),
    room: cleanString(params.get("room")),
    view: cleanString(params.get("view")),
  };
}

function loadTripIntentFromSession(): TripIntent {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(TRIP_INTENT_SESSION_KEY);
    if (!raw) return {};
    return mergeTripIntent({}, JSON.parse(raw) as TripIntent);
  } catch {
    return {};
  }
}

function saveTripIntentToSession(intent: TripIntent) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TRIP_INTENT_SESSION_KEY, JSON.stringify(intent));
  } catch {
    // Ignore storage failures.
  }
}

function isValidYMD(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function DvcCalculator() {
  function parseYMDToLocalDate(ymd: string) {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }

  function formatYMDForDisplay(ymd: string) {
    return parseYMDToLocalDate(ymd).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getLocalTodayYMD() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function addDays(ymd: string, days: number) {
    const date = parseYMDToLocalDate(ymd);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function clampYMD(value: string, min: string, max: string) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  const todayYMD = getLocalTodayYMD();
  const fallbackCheckIn = todayYMD > LATEST_CHECK_IN_DATE ? LATEST_CHECK_IN_DATE : todayYMD;

  function sanitizeStayDates(rawCheckIn?: string, rawCheckOut?: string) {
    let message: string | null = null;

    let nextCheckIn = isValidYMD(rawCheckIn) ? rawCheckIn! : fallbackCheckIn;
    if (nextCheckIn < todayYMD) {
      nextCheckIn = fallbackCheckIn;
      message = INVALID_RANGE_MESSAGE;
    }
    if (nextCheckIn > LATEST_CHECK_IN_DATE) {
      nextCheckIn = LATEST_CHECK_IN_DATE;
      message = MAX_PRICING_MESSAGE;
    }

    let nextCheckOut = isValidYMD(rawCheckOut) ? rawCheckOut! : addDays(nextCheckIn, 7);
    if (nextCheckOut <= nextCheckIn) {
      nextCheckOut = addDays(nextCheckIn, 7);
      message = INVALID_RANGE_MESSAGE;
    }
    if (nextCheckOut > MAX_PRICING_DATE) {
      nextCheckOut = MAX_PRICING_DATE;
      message = MAX_PRICING_MESSAGE;
    }
    if (nextCheckOut <= nextCheckIn) {
      nextCheckIn = clampYMD(nextCheckIn, fallbackCheckIn, LATEST_CHECK_IN_DATE);
      nextCheckOut = MAX_PRICING_DATE;
      message = MAX_PRICING_MESSAGE;
    }

    return { checkIn: nextCheckIn, checkOut: nextCheckOut, message };
  }

  const [mode, setMode] = useState<"single" | "compare">("single");

  // shared inputs
  const initialDates = sanitizeStayDates(fallbackCheckIn, addDays(fallbackCheckIn, 7));
  const [checkIn, setCheckIn] = useState(initialDates.checkIn);
  const [checkOut, setCheckOut] = useState(initialDates.checkOut);
  const [dateError, setDateError] = useState<string | null>(null);
  const nights = useMemo(() => diffNights(checkIn, checkOut) ?? 0, [checkIn, checkOut]);

  // single mode inputs
  const [resort, setResort] = useState(Resorts[0]?.code ?? "AKV");
  const meta = useMemo(() => Resorts.find(r => r.code === resort)!, [resort]);
  const [room, setRoom] = useState<RoomCode>(meta.roomTypes[0]);
  const roomViews = meta.viewsByRoom[room] ?? [];
  const [view, setView] = useState<ViewCode>((roomViews[0] || "S") as ViewCode);
  const [prefillRoom, setPrefillRoom] = useState<RoomCode | null>(null);
  const [prefillView, setPrefillView] = useState<ViewCode | null>(null);
  const [tripIntentContext, setTripIntentContext] = useState<TripIntent>({});
  const [hasHydratedTripIntent, setHasHydratedTripIntent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryIntent = parseTripIntentFromParams(params);
    const sessionIntent = loadTripIntentFromSession();
    const incomingIntent = hasTripIntent(queryIntent) ? mergeTripIntent(sessionIntent, queryIntent) : sessionIntent;
    const selectedCode = resolveResortCodeFromParam(incomingIntent.resort);
    const incomingCheckOut =
      incomingIntent.checkOut ??
      (incomingIntent.checkIn && incomingIntent.nights ? addDays(incomingIntent.checkIn, incomingIntent.nights) : undefined);
    const hydratedDates = sanitizeStayDates(incomingIntent.checkIn, incomingCheckOut);
    setCheckIn(hydratedDates.checkIn);
    setCheckOut(hydratedDates.checkOut);
    setDateError(hydratedDates.message);
    if (incomingIntent.room) {
      setPrefillRoom(incomingIntent.room as RoomCode);
    }
    if (incomingIntent.view) {
      setPrefillView(incomingIntent.view as ViewCode);
    }
    if (selectedCode) {
      setResort(selectedCode);
    }
    if (hasTripIntent(incomingIntent)) {
      setTripIntentContext(
        mergeTripIntent(incomingIntent, {
          checkIn: hydratedDates.checkIn,
          checkOut: hydratedDates.checkOut,
          nights: diffNights(hydratedDates.checkIn, hydratedDates.checkOut),
        }),
      );
      setHasHydratedTripIntent(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(DVC_CALC_DRAFT_KEY);
      if (!raw) {
        setHasHydratedTripIntent(true);
        return;
      }
      const draft = JSON.parse(raw) as DvcCalcDraft;
      if (!draft) {
        setHasHydratedTripIntent(true);
        return;
      }
      if (draft.mode) setMode(draft.mode);
      const draftDates = sanitizeStayDates(
        draft.checkIn,
        draft.checkIn && typeof draft.nights === "number" && Number.isFinite(draft.nights)
          ? addDays(draft.checkIn, draft.nights)
          : undefined,
      );
      setCheckIn(draftDates.checkIn);
      setCheckOut(draftDates.checkOut);
      setDateError(draftDates.message);
      if (draft.resort) setResort(draft.resort);
      if (draft.room) setPrefillRoom(draft.room);
      if (draft.view) setPrefillView(draft.view);
      if (draft.result) {
        setRes(draft.result);
        setHasEstimatedOnce(true);
      }
    } catch {
      // Ignore malformed drafts.
    }
    setHasHydratedTripIntent(true);
  }, []);

  // Reset room and view when resort changes
  useEffect(() => {
    const fallbackRoom = meta.roomTypes[0];
    const nextRoom =
      prefillRoom && meta.roomTypes.includes(prefillRoom) ? prefillRoom : fallbackRoom;
    setRoom(nextRoom);

    const viewsForRoom = meta.viewsByRoom[nextRoom] ?? [];
    const fallbackView = (viewsForRoom[0] || "S") as ViewCode;
    const nextView =
      prefillView && viewsForRoom.includes(prefillView) ? prefillView : fallbackView;
    setView(nextView);

    if (prefillRoom) {
      setPrefillRoom(null);
    }
    if (prefillView) {
      setPrefillView(null);
    }
  }, [resort, meta, prefillRoom, prefillView]);

  // Reset view when room changes
  useEffect(() => {
    if (prefillView) return;
    const firstView = (meta.viewsByRoom[room]?.[0] || "S") as ViewCode;
    setView(firstView);
  }, [room, meta, prefillView]);

  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hasEstimatedOnce, setHasEstimatedOnce] = useState(false);
  const [isEstimateDirty, setIsEstimateDirty] = useState(false);
  const autoEstimateTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const previousEstimateKeyRef = useRef<string | null>(null);

  function normalizeSelection(
    resortCode: string,
    nextRoom: RoomCode,
    nextView: ViewCode,
  ): { room: RoomCode; view: ViewCode } {
    const selectedResort = Resorts.find((item) => item.code === resortCode);
    if (!selectedResort) {
      return { room: nextRoom, view: nextView };
    }

    const safeRoom = selectedResort.roomTypes.includes(nextRoom)
      ? nextRoom
      : selectedResort.roomTypes[0];
    const safeViews = selectedResort.viewsByRoom[safeRoom] ?? [];
    const safeView = safeViews.includes(nextView)
      ? nextView
      : ((safeViews[0] || "S") as ViewCode);

    return { room: safeRoom, view: safeView };
  }

  const persistDraft = () => {
    if (typeof window === "undefined") return;
    const draft: DvcCalcDraft = {
      mode,
      checkIn,
      nights,
      resort,
      room,
      view,
      result: res
        ? {
            totalPoints: Number(res.totalPoints ?? 0),
            totalUSD: Number(res.totalUSD ?? 0),
            pppUSD: Number(res.pppUSD ?? 0),
            pricingTier: String(res.pricingTier ?? ""),
          }
        : undefined,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(DVC_CALC_DRAFT_KEY, JSON.stringify(draft));
  };

  useEffect(() => {
    if (!hasHydratedTripIntent) return;
    const nextIntent = mergeTripIntent(tripIntentContext, {
      checkIn,
      checkOut,
      nights,
      resort: RESORT_CODE_TO_SLUG[resort] ?? tripIntentContext.resort ?? resort,
      room,
      view,
    });
    saveTripIntentToSession(nextIntent);
  }, [checkIn, checkOut, nights, resort, room, view, tripIntentContext, hasHydratedTripIntent]);

  function handleCheckInChange(nextCheckIn: string) {
    const sanitized = sanitizeStayDates(nextCheckIn, checkOut);
    setCheckIn(sanitized.checkIn);
    setCheckOut(sanitized.checkOut);
    setDateError(sanitized.message);
  }

  function handleCheckOutChange(nextCheckOut: string) {
    const sanitized = sanitizeStayDates(checkIn, nextCheckOut);
    setCheckIn(sanitized.checkIn);
    setCheckOut(sanitized.checkOut);
    setDateError(sanitized.message);
  }

  function runSingle(options?: { preserveResult?: boolean }) {
    setLoading(true);
    setErr(null);
    if (!options?.preserveResult) {
      setRes(null);
    }
    try {
      const normalized = normalizeSelection(resort, room, view);
      previousEstimateKeyRef.current = [checkIn, checkOut, nights, resort, normalized.room, normalized.view].join("|");
      if (normalized.room !== room) setRoom(normalized.room);
      if (normalized.view !== view) setView(normalized.view);
      const data = quoteStay({
        resortCode: resort,
        room: normalized.room,
        view: normalized.view,
        checkIn,
        nights
      });
      setRes(data);
      setHasEstimatedOnce(true);
      setIsEstimateDirty(false);
    } catch (e: any) {
      setErr(e.message || "Error");
      setRes(null);
      setIsEstimateDirty(false);
    }
    finally { setLoading(false); }
  }

  // Compare view state
  const [tableRows, setTableRows] = useState<any[]>([]);

  function handleResortChange(nextResortCode: string) {
    const normalized = normalizeSelection(nextResortCode, room, view);
    setResort(nextResortCode);
    setRoom(normalized.room);
    setView(normalized.view);
  }

  useEffect(() => {
    if (!hasHydratedTripIntent || mode !== "single") return;

    const nextKey = [checkIn, checkOut, nights, resort, room, view].join("|");
    if (previousEstimateKeyRef.current === null) {
      previousEstimateKeyRef.current = nextKey;
      return;
    }

    if (previousEstimateKeyRef.current === nextKey) {
      return;
    }

    previousEstimateKeyRef.current = nextKey;

    if (!hasEstimatedOnce) {
      return;
    }

    setIsEstimateDirty(true);

    if (autoEstimateTimeoutRef.current !== null) {
      window.clearTimeout(autoEstimateTimeoutRef.current);
    }

    autoEstimateTimeoutRef.current = window.setTimeout(() => {
      autoEstimateTimeoutRef.current = null;
      runSingle({ preserveResult: true });
    }, 180);

    return () => {
      if (autoEstimateTimeoutRef.current !== null) {
        window.clearTimeout(autoEstimateTimeoutRef.current);
        autoEstimateTimeoutRef.current = null;
      }
    };
  }, [checkIn, checkOut, nights, resort, room, view, mode, hasEstimatedOnce, hasHydratedTripIntent]);

  // Function to select a specific resort/room combo from compare mode
  function selectFromCompare(resortCode: string, roomType: RoomCode) {
    const selectedResort = Resorts.find(r => r.code === resortCode);
    if (!selectedResort) return;

    // Switch to single mode
    setMode("single");

    // Set the resort
    setResort(resortCode);

    // Set the room type
    const normalized = normalizeSelection(resortCode, roomType, view);
    setRoom(normalized.room);

    // Set the first available view for that room
    setView(normalized.view);

    // Auto-run the calculation
    setLoading(true);
    setErr(null);
    try {
      const data = quoteStay({
        resortCode,
        room: normalized.room,
        view: normalized.view,
        checkIn,
        nights
      });
      setRes(data);
      setHasEstimatedOnce(true);
      setIsEstimateDirty(false);
      previousEstimateKeyRef.current = [checkIn, checkOut, nights, resortCode, normalized.room, normalized.view].join("|");
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  function runCompare() {
    setLoading(true); setErr(null); setTableRows([]);
    try {
      // Compute all room types for each resort
      const all = Resorts.map(r => {
        const values: any = {};

        // Calculate each room type the resort actually has
        for (const room of r.roomTypes) {
          const view = (r.viewsByRoom[room]?.[0] || "S") as ViewCode;
          try {
            const q = quoteStay({
              resortCode: r.code,
              room: room,
              view: view,
              checkIn,
              nights
            });
            values[room] = { points: q.totalPoints, totalUSD: q.totalUSD };
          } catch {
            values[room] = null;
          }
        }
        return { resortCode: r.code, resortName: r.name, values, roomTypes: r.roomTypes };
      });

      // Sort alphabetically by resort name
      all.sort((a, b) => a.resortName.localeCompare(b.resortName));

      setTableRows(all);
    } catch (e: any) { setErr(e.message || "Error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-6xl mx-auto rounded-[1.5rem] bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[#0b1f44]">Your stay estimate</h2>
        <div className="flex gap-1 rounded-xl border border-[#0F2148]/8 bg-[#f7f8fc] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <button
            onClick={() => setMode("single")}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              mode === "single"
                ? "bg-[linear-gradient(to_bottom,#5a6bd7,#4457c7)] text-white shadow-[0_10px_20px_rgba(44,59,122,0.22)]"
                : "text-[#0F2148]/58 hover:text-[#0F2148]/82"
            }`}
          >
            Single
          </button>
          <button
            onClick={() => setMode("compare")}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              mode === "compare"
                ? "bg-[linear-gradient(to_bottom,#5a6bd7,#4457c7)] text-white shadow-[0_10px_20px_rgba(44,59,122,0.22)]"
                : "text-[#0F2148]/58 hover:text-[#0F2148]/82"
            }`}
          >
            Compare
          </button>
        </div>
      </div>
      <div className="mt-2 text-sm text-slate-500">
        Estimates do not reflect live availability. Our concierge team confirms availability before any booking.
      </div>

      {/* Shared inputs */}
      <div className="grid gap-3 mt-4 md:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.18em] text-[#0F2148]/58">Check-in</label>
          <input
            type="date"
            className="w-full rounded-2xl border border-[#0F2148]/12 bg-[#fbfcff] px-4 py-3 text-[15px] text-[#0F2148] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition focus:border-[#4c5fd7]/30 focus:bg-white"
            value={checkIn}
            min={todayYMD}
            max={LATEST_CHECK_IN_DATE}
            onChange={e => handleCheckInChange(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.18em] text-[#0F2148]/58">Check-out</label>
          <input
            type="date"
            className="w-full rounded-2xl border border-[#0F2148]/12 bg-[#fbfcff] px-4 py-3 text-[15px] text-[#0F2148] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition focus:border-[#4c5fd7]/30 focus:bg-white"
            value={checkOut}
            min={addDays(checkIn, 1)}
            max={MAX_PRICING_DATE}
            onChange={e => handleCheckOutChange(e.target.value)}
          />
          {dateError ? <div className="mt-1 text-xs text-red-600">{dateError}</div> : null}
        </div>
        <div className="flex items-end">
          <div className="w-full rounded-2xl border border-[#0F2148]/10 bg-[#f7f8fc] px-4 py-3 text-[15px] font-medium text-[#42506f]">
            {nights} night(s)
          </div>
        </div>
      </div>

      {mode === "single" ? (
        <>
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.18em] text-[#0F2148]/58">Resort</label>
              <select className="w-full rounded-2xl border border-[#0F2148]/12 bg-[#fbfcff] px-4 py-3 text-[15px] text-[#0F2148] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition focus:border-[#4c5fd7]/30 focus:bg-white" value={resort} onChange={e => handleResortChange(e.target.value)}>
                {Resorts.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.18em] text-[#0F2148]/58">Room</label>
              <select className="w-full rounded-2xl border border-[#0F2148]/12 bg-[#fbfcff] px-4 py-3 text-[15px] text-[#0F2148] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition focus:border-[#4c5fd7]/30 focus:bg-white" value={room} onChange={e => setRoom(e.target.value as RoomCode)}>
                {meta.roomTypes.map(rt => <option key={rt} value={rt}>{label(rt)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.18em] text-[#0F2148]/58">View</label>
              <select className="w-full rounded-2xl border border-[#0F2148]/12 bg-[#fbfcff] px-4 py-3 text-[15px] text-[#0F2148] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition focus:border-[#4c5fd7]/30 focus:bg-white" value={view} onChange={e => setView(e.target.value as ViewCode)}>
                {roomViews.map(v => <option key={v} value={v}>{meta.viewNames[v]}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={() => runSingle()}
            disabled={loading || nights < 1}
            className="mt-5 inline-flex min-h-[50px] items-center justify-center rounded-xl bg-[linear-gradient(to_bottom,#5a6bd7,#4457c7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(45,60,122,0.24)] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-[1px] hover:brightness-[1.02] hover:shadow-[0_18px_34px_rgba(45,60,122,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (hasEstimatedOnce ? "Updating estimate…" : "Calculating…") : "Get Instant Price"}
          </button>

          {err && <div className="mt-3 text-red-600">{err}</div>}
          {res && (
            <>
              {(() => {
                const summaryImage =
                  SUMMARY_IMAGE_OVERRIDE_BY_CODE[resort] ??
                  resolveResortImage({
                    resortCode: resort,
                    resortSlug: RESORT_CODE_TO_SLUG[resort],
                    imageIndex: 1,
                  }).url;
                const averageNightly = nights > 0 ? res.totalUSD / nights : 0;
                const estimatedCheckOut = addDays(checkIn, nights);
                return (
                  <>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Stat
                  label="Total Points"
                  value={isEstimateDirty ? <EstimateSkeleton className="h-8 w-24" /> : res.totalPoints}
                />
                <Stat
                  label={isEstimateDirty ? "Updating estimate…" : `${res.pricingTier} • ${formatPointRate(res.pppUSD)}/pt`}
                  value={isEstimateDirty ? <EstimateSkeleton className="h-8 w-28" /> : formatCurrency(res.totalUSD)}
                />
              </div>
              <div className="mt-2.5 text-sm text-[#0F2148]/62">
                {isEstimateDirty ? (
                  <span className="font-medium text-[#0F2148]/82">Updating estimate…</span>
                ) : (
                  <>
                    Estimated using <span className="font-medium text-[#0F2148]/82">{res.pricingTier}</span> pricing.
                  </>
                )}
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-[#4c5fd7]/12 bg-white shadow-[0_24px_60px_rgba(27,42,89,0.10)]">
                <div className="grid lg:grid-cols-[1.18fr_1fr]">
                  <div className="relative min-h-[208px] overflow-hidden bg-slate-200 aspect-[5/4] lg:aspect-[1.18/1]">
                    <img
                      src={summaryImage}
                      alt={meta.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={event => {
                        const target = event.currentTarget;
                        const fallback = SUMMARY_IMAGE_FALLBACK_BY_CODE[resort];

                        if (fallback && target.getAttribute("src") !== fallback) {
                          target.src = fallback;
                          return;
                        }

                        if (target.getAttribute("src") !== DEFAULT_SUMMARY_IMAGE) {
                          target.src = DEFAULT_SUMMARY_IMAGE;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[rgba(10,20,40,0.14)] via-[rgba(10,20,40,0.04)] to-transparent" />
                  </div>

                  <div className="flex flex-col justify-between p-6 sm:p-7">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Reservation preview</p>
                        <h3 className="text-[1.9rem] font-semibold leading-[1.08] text-[#15284f]">{meta.name}</h3>
                        <p className="text-[15px] text-slate-600">
                          {label(room)} · {meta.viewNames[view]}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                          <span>{formatYMDForDisplay(checkIn)}–{formatYMDForDisplay(estimatedCheckOut)}</span>
                          <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
                          <span>{nights} nights</span>
                          {meta.occupancy?.[room] ? (
                            <>
                              <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
                              <span>{meta.occupancy[room]} guests</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3.5">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Average per night</p>
                          {isEstimateDirty ? (
                            <EstimateSkeleton className="mt-2 h-8 w-36" />
                          ) : (
                            <p className="mt-2 text-[1.85rem] font-semibold text-[#15284f]">
                              {formatAverageNightly(averageNightly)}
                              <span className="ml-1 text-sm font-medium text-slate-500">USD</span>
                            </p>
                          )}
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3.5">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Estimated total (USD)</p>
                          {isEstimateDirty ? (
                            <EstimateSkeleton className="mt-2 h-8 w-40" />
                          ) : (
                            <p className="mt-2 text-[1.85rem] font-semibold text-[#15284f]">
                              {formatCurrency(res.totalUSD)}
                              <span className="ml-1 text-sm font-medium text-slate-500">USD</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-start gap-3 rounded-2xl bg-[#fafbff] px-4 py-3.5">
                          <HomeIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#4c5fd7]" />
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Stay details</div>
                            <div className="mt-1 text-sm font-medium text-slate-900">
                              {label(room)}, {meta.viewNames[view]}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-2xl bg-[#fafbff] px-4 py-3.5">
                          <SparklesIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#4c5fd7]" />
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Pricing tier</div>
                            {isEstimateDirty ? (
                              <EstimateSkeleton className="mt-1 h-5 w-32" />
                            ) : (
                              <div className="mt-1 text-sm font-medium text-slate-900">{res.pricingTier}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
                        {isEstimateDirty ? (
                          <EstimateSkeleton className="h-5 w-32" />
                        ) : (
                          <span className="font-medium text-slate-900">{res.totalPoints} DVC points</span>
                        )}
                        <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
                        {isEstimateDirty ? (
                          <EstimateSkeleton className="h-5 w-28" />
                        ) : (
                          <span>{formatPointRate(res.pppUSD)} per point</span>
                        )}
                      </div>
                    </div>

                    {(resort === "AUL" || resort === "VDH") ? (
                      <div className="mt-5 rounded-2xl border border-[#4c5fd7]/10 bg-[#f8faff] px-4 py-3.5 text-sm text-slate-600">
                        <div className="font-medium text-[#22386e]">Taxes due at checkout</div>
                        <div className="mt-1">
                          {resort === "VDH"
                            ? "Anaheim requires a nightly transient occupancy tax for DVC stays at The Villas at Disneyland Hotel. This tax is paid to the resort at checkout."
                            : "Hawai‘i requires transient accommodations taxes for DVC stays at Aulani. This tax is paid to the resort at checkout."}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">Rates vary by year and are subject to change.</div>
                      </div>
                    ) : null}

                    <button
                      onClick={() => {
                        const token = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                          ? crypto.randomUUID()
                          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                        const quoteBundle = {
                          v: 1,
                          savedAt: new Date().toISOString(),
                          quote: {
                            resortCode: resort,
                            resortName: meta.name,
                            checkIn,
                            checkOut: estimatedCheckOut,
                            nights,
                            room,
                            view,
                            villaType: label(room) || "Villa",
                            viewType: meta.viewNames[view] ?? view,
                            points: Number(res.totalPoints ?? 0),
                            totalUSD: Number(res.totalUSD ?? 0),
                            pricingTier: String(res.pricingTier ?? ""),
                          },
                        };

                        window.localStorage.setItem(`${QUOTE_KEY_PREFIX}${token}`, JSON.stringify(quoteBundle));
                        persistDraft();
                        window.location.href = `/book?quote=${encodeURIComponent(token)}`;
                      }}
                      disabled={loading || isEstimateDirty}
                      className="mt-5 w-full rounded-xl bg-[linear-gradient(to_bottom,#5a6bd7,#4457c7)] px-6 py-3 text-white font-semibold shadow-[0_14px_28px_rgba(45,60,122,0.24)] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-[1px] hover:brightness-[1.02] hover:shadow-[0_18px_34px_rgba(45,60,122,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Continue to guest details
                    </button>
                  </div>
                </div>
              </div>
                  </>
                );
              })()}

              <details className="mt-6 rounded-2xl border border-[#0F2148]/8 bg-white/80 px-5 py-4 shadow-[0_12px_30px_rgba(15,33,72,0.05)] [&_summary::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer list-none marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-2.5 text-[15px] font-semibold text-[#0F2148]">
                      <InformationCircleIcon className="h-5 w-5 text-[#4c5fd7]" />
                      How PixieDVC pricing works
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4c5fd7]">
                      <span>Expand</span>
                      <ChevronDownIcon className="h-4 w-4" />
                    </span>
                  </span>
                </summary>
                <div className="mt-4 border-t border-[#0F2148]/6 pt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {PRICING_TIER_DETAILS.map((tier) => (
                      <div
                        key={tier.name}
                        className="rounded-2xl bg-[#f8faff] px-4 py-4 shadow-[0_8px_20px_rgba(15,33,72,0.04)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-[#0F2148]">{tier.name}</h4>
                          <span className="text-sm font-medium text-[#4c5fd7]">{tier.rate}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#0F2148]/68">{tier.description}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#0F2148]/62">
                    Your estimate reflects the access tier that matches your selected resort and booking window.
                    Final availability is still confirmed before you move forward.
                  </p>
                </div>
              </details>
            </>
          )}
        </>
      ) : (
        <>
          <button
            onClick={runCompare}
            disabled={loading || nights < 1}
            className="mt-4 rounded-xl bg-[linear-gradient(to_bottom,#5a6bd7,#4457c7)] px-4 py-2.5 text-white shadow-[0_12px_24px_rgba(45,60,122,0.2)] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-[1px] hover:brightness-[1.02] hover:shadow-[0_16px_30px_rgba(45,60,122,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Calculating…" : "Compare All Resorts"}
          </button>
          {err && <div className="mt-3 text-red-600">{err}</div>}
          {tableRows.length > 0 && (
            <div className="mt-6">
              <ResultsTable
                rows={tableRows}
                onReserve={(code, room) => {
                  selectFromCompare(code, room as RoomCode);
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#f3f6ff] p-4 shadow-[0_8px_18px_rgba(15,33,72,0.03)]">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function EstimateSkeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-[#dfe6fb] ${className}`.trim()} />;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPointRate(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatAverageNightly(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function label(room: string) {
  switch (room) {
    case "STUDIO": return "Deluxe Studio";
    case "RESORTSTUDIO": return "Resort Studio";
    case "DUOSTUDIO": return "Duo Studio";
    case "DELUXESTUDIO": return "Deluxe Studio";
    case "GARDENDUOSTUDIO": return "Garden Room Duo Studio";
    case "GARDENDELUXESTUDIO": return "Garden Room Deluxe Studio";
    case "CABIN": return "Cabin";
    case "ONEBR": return "One Bedroom";
    case "TWOBR": return "Two Bedroom";
    case "TWOBRBUNGALOW": return "Two-Bedroom Bungalow";
    case "PENTHOUSE": return "Two-Bedroom Penthouse Villa";
    case "GRANDVILLA": return "Grand Villa";
    case "TREEHOUSE": return "Three-Bedroom Treehouse Villa";
    case "TOWERSTUDIO": return "Tower Studio";
    case "INNROOM": return "Deluxe Inn Room";
    case "COTTAGE": return "Three-Bedroom Beach Cottage";
    default: return room;
  }
}

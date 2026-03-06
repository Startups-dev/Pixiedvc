// src/ui/DvcCalculator.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  HomeIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Resorts } from "../engine/charts";
import { quoteStay } from "../engine/calc";
import type { RoomCode, ViewCode } from "../engine/types";
import { ResultsTable } from "./ResultsTable";

const DVC_CALC_DRAFT_KEY = "pixiedvc:dvcCalcDraft:v1";
const QUOTE_KEY_PREFIX = "pixiedvc:quote:";
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
  diningInterested: boolean;
  diningPlan: "quick" | "standard";
  diningAdults: number;
  diningChildren: number;
  result?: {
    totalPoints: number;
    totalUSD: number;
    pppUSD: number;
    pricingTier: string;
  };
  updatedAt: number;
};

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

  const [mode, setMode] = useState<"single" | "compare">("single");

  // shared inputs
  const [checkIn, setCheckIn] = useState(getLocalTodayYMD());
  const [nights, setNights] = useState(7);

  // single mode inputs
  const [resort, setResort] = useState(Resorts[0]?.code ?? "AKV");
  const meta = useMemo(() => Resorts.find(r => r.code === resort)!, [resort]);
  const [room, setRoom] = useState<RoomCode>(meta.roomTypes[0]);
  const roomViews = meta.viewsByRoom[room] ?? [];
  const [view, setView] = useState<ViewCode>((roomViews[0] || "S") as ViewCode);
  const [prefillRoom, setPrefillRoom] = useState<RoomCode | null>(null);
  const [prefillView, setPrefillView] = useState<ViewCode | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resortParam = params.get("resort");
    const checkInParam = params.get("checkIn")?.trim();
    const nightsParam = params.get("nights")?.trim();
    const roomParam = params.get("room")?.trim() as RoomCode | null;
    const viewParam = params.get("view")?.trim() as ViewCode | null;

    if (checkInParam) {
      setCheckIn(checkInParam);
    }
    if (nightsParam) {
      const nightsValue = Number.parseInt(nightsParam, 10);
      if (Number.isFinite(nightsValue) && nightsValue > 0) {
        setNights(nightsValue);
      }
    }
    if (roomParam) {
      setPrefillRoom(roomParam);
    }
    if (viewParam) {
      setPrefillView(viewParam);
    }

    const selectedCode = resolveResortCodeFromParam(resortParam);
    if (selectedCode) {
      setResort(selectedCode);
    }
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
  const [diningInterested, setDiningInterested] = useState(false);
  const [diningPlan, setDiningPlan] = useState<"quick" | "standard">("quick");
  const [diningAdults, setDiningAdults] = useState(2);
  const [diningChildren, setDiningChildren] = useState(0);

  const persistDraft = () => {
    if (typeof window === "undefined") return;
    const draft: DvcCalcDraft = {
      mode,
      checkIn,
      nights,
      resort,
      room,
      view,
      diningInterested,
      diningPlan,
      diningAdults,
      diningChildren,
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
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DVC_CALC_DRAFT_KEY);
      if (!raw) return;
      const hasResortParam = new URLSearchParams(window.location.search).has("resort");
      const draft = JSON.parse(raw) as DvcCalcDraft;
      if (!draft) return;
      if (draft.mode) setMode(draft.mode);
      if (draft.checkIn) setCheckIn(draft.checkIn);
      if (typeof draft.nights === "number" && Number.isFinite(draft.nights)) {
        setNights(draft.nights);
      }
      if (!hasResortParam && draft.resort) setResort(draft.resort);
      if (draft.room) setPrefillRoom(draft.room);
      if (draft.view) setPrefillView(draft.view);
      setDiningInterested(Boolean(draft.diningInterested));
      if (draft.diningPlan === "quick" || draft.diningPlan === "standard") {
        setDiningPlan(draft.diningPlan);
      }
      if (typeof draft.diningAdults === "number" && Number.isFinite(draft.diningAdults)) {
        setDiningAdults(Math.max(0, draft.diningAdults));
      }
      if (typeof draft.diningChildren === "number" && Number.isFinite(draft.diningChildren)) {
        setDiningChildren(Math.max(0, draft.diningChildren));
      }
      if (draft.result) {
        setRes(draft.result);
      }
    } catch {
      // Ignore malformed drafts.
    }
  }, []);

  function runSingle() {
    setLoading(true); setErr(null); setRes(null);
    try {
      const data = quoteStay({ resortCode: resort, room, view, checkIn, nights });
      setRes(data);
    } catch (e: any) { setErr(e.message || "Error"); }
    finally { setLoading(false); }
  }

  // Compare view state
  const [tableRows, setTableRows] = useState<any[]>([]);

  // Function to select a specific resort/room combo from compare mode
  function selectFromCompare(resortCode: string, roomType: RoomCode) {
    const selectedResort = Resorts.find(r => r.code === resortCode);
    if (!selectedResort) return;

    // Switch to single mode
    setMode("single");

    // Set the resort
    setResort(resortCode);

    // Set the room type
    setRoom(roomType);

    // Set the first available view for that room
    const firstView = (selectedResort.viewsByRoom[roomType]?.[0] || "S") as ViewCode;
    setView(firstView);

    // Auto-run the calculation
    setLoading(true);
    setErr(null);
    try {
      const data = quoteStay({
        resortCode,
        room: roomType,
        view: firstView,
        checkIn,
        nights
      });
      setRes(data);
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
    <div className="max-w-6xl mx-auto bg-white rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">PixieDVC Cost Calculator</h2>
        <div className="flex gap-2">
          <button onClick={() => setMode("single")} className={`px-3 py-1 rounded ${mode === "single" ? "bg-indigo-600 text-white" : "bg-slate-100"}`}>Single</button>
          <button onClick={() => setMode("compare")} className={`px-3 py-1 rounded ${mode === "compare" ? "bg-indigo-600 text-white" : "bg-slate-100"}`}>Compare</button>
        </div>
      </div>
      <div className="mt-2 text-sm text-slate-500">
        Estimates do not reflect live availability. Our concierge team confirms availability before any booking.
      </div>

      {/* Shared inputs */}
      <div className="grid md:grid-cols-4 gap-3 mt-4">
        <div>
          <label className="text-sm font-medium">Check-in</label>
          <input type="date" className="w-full border rounded p-2" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
        </div>
        <div className="md:col-span-3">
          <label className="text-sm font-medium">Nights</label>
          <input type="range" min={1} max={14} className="w-full" value={nights} onChange={e => setNights(Number(e.target.value))} />
          <div className="text-xs text-slate-500">{nights} night(s)</div>
        </div>
      </div>

      {mode === "single" ? (
        <>
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="text-sm font-medium">Resort</label>
              <select className="w-full border rounded p-2" value={resort} onChange={e => setResort(e.target.value)}>
                {Resorts.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Room</label>
              <select className="w-full border rounded p-2" value={room} onChange={e => setRoom(e.target.value as RoomCode)}>
                {meta.roomTypes.map(rt => <option key={rt} value={rt}>{label(rt)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">View</label>
              <select className="w-full border rounded p-2" value={view} onChange={e => setView(e.target.value as ViewCode)}>
                {roomViews.map(v => <option key={v} value={v}>{meta.viewNames[v]}</option>)}
              </select>
            </div>
          </div>

          <button onClick={runSingle} disabled={loading} className="mt-4 px-4 py-2 rounded bg-indigo-600 text-white">
            {loading ? "Calculating…" : "Get Instant Price"}
          </button>

          {err && <div className="mt-3 text-red-600">{err}</div>}
          {res && (
            <>
              <div className="mt-6 grid md:grid-cols-2 gap-3">
                <Stat label="Total Points" value={res.totalPoints} />
                <Stat
                  label={`${res.pricingTier} @ ${formatPointRate(res.pppUSD)}/pt`}
                  value={formatCurrency(res.totalUSD)}
                />
              </div>

              <div className="mt-6 rounded-2xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Dining Plan (Optional)</div>
                    <div className="text-sm text-slate-500">
                      Would you be interested in adding a dining plan to your reservation?
                    </div>
                  </div>
                  <a href="/dining-plan" className="text-sm text-slate-500 hover:underline">
                    What is the Dining Plan?
                  </a>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDiningInterested(false)}
                    className={`px-3 py-1 rounded border text-sm ${
                      diningInterested ? "border-slate-200 text-slate-500" : "border-slate-800 text-slate-800"
                    }`}
                  >
                    No, not interested
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiningInterested(true)}
                    className={`px-3 py-1 rounded border text-sm ${
                      diningInterested ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-500"
                    }`}
                  >
                    Yes, show dining plan options
                  </button>
                </div>

                {diningInterested && (
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium">Plan</label>
                      <select
                        className="w-full border rounded p-2 mt-1"
                        value={diningPlan}
                        onChange={(e) => setDiningPlan(e.target.value as "quick" | "standard")}
                      >
                        <option value="quick">Quick-Service Dining Plan</option>
                        <option value="standard">Disney Dining Plan (includes table service)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Adults (10+)</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full border rounded p-2 mt-1"
                        value={diningAdults}
                        onChange={(e) => setDiningAdults(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Children (3–9)</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full border rounded p-2 mt-1"
                        value={diningChildren}
                        onChange={(e) => setDiningChildren(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                    <div className="md:col-span-4 text-sm text-slate-500">
                      <div>
                        Estimated dining plan cost:{" "}
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(
                            nights *
                              (diningPlan === "quick"
                                ? diningAdults * 57.01 + diningChildren * 23.83
                                : diningAdults * 94.28 + diningChildren * 29.69),
                          )}
                        </span>{" "}
                        <span className="text-xs text-slate-500">(to be confirmed)</span>
                      </div>
                      <div className="mt-1">
                        Estimated stay total:{" "}
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(res.totalUSD)}
                        </span>
                      </div>
                      <div className="mt-1">
                        Estimated stay + dining total:{" "}
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(
                            res.totalUSD +
                              nights *
                                (diningPlan === "quick"
                                  ? diningAdults * 57.01 + diningChildren * 23.83
                                  : diningAdults * 94.28 + diningChildren * 29.69),
                          )}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        Dining Plans are added after your reservation is secured; final pricing is set by Disney and may
                        change.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Summary Card */}
              <div className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
                <h3 className="text-lg font-bold text-indigo-900 mb-4">Your Stay Summary</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <BuildingOffice2Icon className="mt-0.5 h-6 w-6 flex-shrink-0 text-indigo-600" />
                    <div>
                      <div className="font-semibold text-gray-700">Resort</div>
                      <div className="text-gray-900">{meta.name}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CalendarDaysIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-indigo-600" />
                    <div>
                      <div className="font-semibold text-gray-700">Dates</div>
                      <div className="text-gray-900">{formatYMDForDisplay(checkIn)} — {nights} night{nights !== 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <HomeIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-indigo-600" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-700">Accommodation</div>
                      <div className="text-gray-900 flex items-center gap-2">
                        <span>{label(room)}, {meta.viewNames[view]}</span>
                        {meta.occupancy?.[room] && (
                          <span className="inline-flex items-center gap-1 text-sm bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                            <UserGroupIcon className="h-4 w-4" />
                            <span className="font-semibold">{meta.occupancy[room]}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <SparklesIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-indigo-600" />
                    <div>
                      <div className="font-semibold text-gray-700">Season</div>
                      <div className="text-gray-900">{res.pricingTier}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <BanknotesIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-indigo-600" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-700">Cost</div>
                      <div className="text-gray-900">
                        {res.totalPoints} points × {formatPointRate(res.pppUSD)} ={" "}
                        <span className="font-bold text-indigo-600 text-lg">{formatCurrency(res.totalUSD)}</span>
                      </div>
                      {diningInterested ? (
                        <div className="mt-1 text-sm text-gray-600">
                          Stay + dining estimate (to be confirmed):{" "}
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(
                              res.totalUSD +
                                nights *
                                  (diningPlan === "quick"
                                    ? diningAdults * 57.01 + diningChildren * 23.83
                                    : diningAdults * 94.28 + diningChildren * 29.69),
                            )}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {(resort === "AUL" || resort === "VDH") ? (
                  <div className="mt-5 rounded-xl border border-indigo-200 bg-white/70 p-4">
                    <div className="font-semibold text-indigo-900">Taxes due at checkout</div>
                    <div className="mt-1 text-sm text-gray-700">
                      {resort === "VDH"
                        ? "Anaheim requires a nightly transient occupancy tax for DVC stays at The Villas at Disneyland Hotel. This tax is not included in points or your PixieDVC estimate and is paid to the resort at checkout."
                        : "Hawai‘i requires transient accommodations taxes for DVC stays at Aulani. This tax is not included in points or your PixieDVC estimate and is paid to the resort at checkout."}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Rates vary by year and are subject to change.</div>
                  </div>
                ) : null}

                <button
                  onClick={() => {
                    const token = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                      ? crypto.randomUUID()
                      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                    const checkOutDate = addDays(checkIn, nights);
                    const quoteBundle = {
                      v: 1,
                      savedAt: new Date().toISOString(),
                      quote: {
                        resortCode: resort,
                        resortName: meta.name,
                        checkIn,
                        checkOut: checkOutDate,
                        nights,
                        room,
                        view,
                        villaType: label(room) || "Villa",
                        points: Number(res.totalPoints ?? 0),
                        totalUSD: Number(res.totalUSD ?? 0),
                        pricingTier: String(res.pricingTier ?? ""),
                      },
                    };

                    window.localStorage.setItem(`${QUOTE_KEY_PREFIX}${token}`, JSON.stringify(quoteBundle));
                    persistDraft();
                    window.location.href = `/book?quote=${encodeURIComponent(token)}`;
                  }}
                  className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
                >
                  Book Now
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <button onClick={runCompare} disabled={loading} className="mt-4 px-4 py-2 rounded bg-indigo-600 text-white">
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
    <div className="bg-indigo-50 rounded p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
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

// src/ui/DvcCalculator.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Resorts } from "../engine/charts.js";
import { quoteStay } from "../engine/calc.js";
import type { RoomCode, ViewCode } from "../engine/types.js";
import { ResultsTable } from "./ResultsTable.js";
import { BuildingOffice2Icon, CalendarDaysIcon, HomeIcon, SparklesIcon, BanknotesIcon, UserGroupIcon } from "@heroicons/react/24/outline";

export function DvcCalculator() {
  const [mode, setMode] = useState<"single" | "compare">("single");

  // shared inputs
  const [checkIn, setCheckIn] = useState(new Date().toISOString().slice(0, 10));
  const [nights, setNights] = useState(7);

  // single mode inputs
  const [resort, setResort] = useState(Resorts[0]?.code ?? "AKV");
  const meta = useMemo(() => Resorts.find(r => r.code === resort)!, [resort]);
  const [room, setRoom] = useState<RoomCode>(meta.roomTypes[0]);
  const roomViews = meta.viewsByRoom[room] ?? [];
  const [view, setView] = useState<ViewCode>((roomViews[0] || "S") as ViewCode);

  // Reset room and view when resort changes
  useEffect(() => {
    const firstRoom = meta.roomTypes[0];
    setRoom(firstRoom);
    const firstView = (meta.viewsByRoom[firstRoom]?.[0] || "S") as ViewCode;
    setView(firstView);
  }, [resort, meta]);

  // Reset view when room changes
  useEffect(() => {
    const firstView = (meta.viewsByRoom[room]?.[0] || "S") as ViewCode;
    setView(firstView);
  }, [room, meta]);

  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

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

      {/* Shared inputs */}
      <div className="grid md:grid-cols-4 gap-3 mt-4">
        <div>
          <label className="text-sm font-medium">Check-in</label>
          <input type="date" className="w-full border rounded p-2" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
        </div>
        <div className="md:col-span-3">
          <label className="text-sm font-medium">Nights</label>
          <input type="range" min={1} max={14} className="w-full" value={nights} onChange={e => setNights(Number(e.target.value))} />
          <div className="text-xs text-slate-600">{nights} night(s)</div>
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
                <Stat label={`${res.pricingTier} @ $${res.pppUSD}/pt`} value={`$${res.totalUSD.toLocaleString()}`} />
              </div>

              {/* Floating Summary Card */}
              <div className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
                <h3 className="text-lg font-bold text-indigo-900 mb-4">Your Stay Summary</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <BuildingOffice2Icon className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-700">Resort</div>
                      <div className="text-gray-900">{meta.name}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CalendarDaysIcon className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-700">Dates</div>
                      <div className="text-gray-900">{new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {nights} night{nights !== 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <HomeIcon className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-700">Accommodation</div>
                      <div className="text-gray-900 flex items-center gap-2">
                        <span>{label(room)}, {meta.viewNames[view]}</span>
                        {meta.occupancy?.[room] && (
                          <span className="inline-flex items-center gap-1 text-sm bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                            <UserGroupIcon className="w-4 h-4" />
                            <span className="font-semibold">{meta.occupancy[room]}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <SparklesIcon className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-700">Season</div>
                      <div className="text-gray-900">{res.pricingTier}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <BanknotesIcon className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-700">Cost</div>
                      <div className="text-gray-900">{res.totalPoints} points × ${res.pppUSD} = <span className="font-bold text-indigo-600 text-lg">${res.totalUSD.toLocaleString()}</span></div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    // Navigate to booking form with prefilled data
                    const params = new URLSearchParams({
                      resort: resort,
                      checkIn: checkIn,
                      nights: nights.toString(),
                      room: room,
                      view: view,
                      points: res.totalPoints.toString(),
                      price: res.totalUSD.toString()
                    });
                    window.location.href = `/book?${params.toString()}`;
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
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
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

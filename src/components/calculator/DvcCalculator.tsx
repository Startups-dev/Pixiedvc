"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  HomeIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

import { quoteStay, Resorts, ResultsTable } from "pixiedvc-calculator";
import type { RoomCode, ViewCode } from "pixiedvc-calculator";
import {
  DINING_PLAN_LABELS,
  DINING_PLAN_RATES,
  calculateDiningTotal,
  type DiningPlanKey,
} from "@/lib/diningPlanPricing";
import {
  getMaxOccupancy,
  getOccupancyLabel,
  getStudioHelperText,
  suggestNextVillaType,
} from "@/lib/occupancy";
import { useReferral } from "@/hooks/useReferral";
import { appendRefToUrl } from "@/lib/referral";

export default function DvcCalculator() {
  const router = useRouter();
  const { ref } = useReferral();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [checkIn, setCheckIn] = useState(new Date().toISOString().slice(0, 10));
  const [nights, setNights] = useState(5);

  const [diningInterested, setDiningInterested] = useState(false);
  const [diningPlan, setDiningPlan] = useState<DiningPlanKey>("quick");
  const [diningAdults, setDiningAdults] = useState(2);
  const [diningChildren, setDiningChildren] = useState(0);
  const hasInitialized = useRef(false);

  const [resort, setResort] = useState(Resorts[0]?.code ?? "AKV");
  const meta = useMemo(() => Resorts.find((item) => item.code === resort)!, [resort]);
  const [room, setRoom] = useState<RoomCode>(meta.roomTypes[0]);
  const roomViews = meta.viewsByRoom[room] ?? [];
  const [view, setView] = useState<ViewCode>((roomViews[0] || "S") as ViewCode);
  const [adultGuests, setAdultGuests] = useState(2);
  const [childGuests, setChildGuests] = useState(0);
  const [infantGuests, setInfantGuests] = useState(0);
  const occupancyWarningRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const firstRoom = meta.roomTypes[0];
    setRoom(firstRoom);
    const firstView = (meta.viewsByRoom[firstRoom]?.[0] || "S") as ViewCode;
    setView(firstView);
  }, [resort, meta]);

  useEffect(() => {
    const firstView = (meta.viewsByRoom[room]?.[0] || "S") as ViewCode;
    setView(firstView);
  }, [room, meta]);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;
    const interested = searchParams.get("diningInterested");
    const plan = searchParams.get("diningPlan");
    const adults = searchParams.get("adults");
    const children = searchParams.get("children");

    if (interested === "1") {
      setDiningInterested(true);
    } else if (interested === "0") {
      setDiningInterested(false);
    }

    if (plan === "quick" || plan === "standard") {
      setDiningPlan(plan);
    }
    if (adults && !Number.isNaN(Number(adults))) {
      setDiningAdults(Math.max(0, Number(adults)));
    }
    if (children && !Number.isNaN(Number(children))) {
      setDiningChildren(Math.max(0, Number(children)));
    }
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("diningInterested", diningInterested ? "1" : "0");
    params.set("diningPlan", diningPlan);
    params.set("adults", String(diningAdults));
    params.set("children", String(diningChildren));
    const next = params.toString();
    if (next !== searchParams.toString()) {
      router.replace(`?${next}`, { scroll: false });
    }
  }, [diningInterested, diningPlan, diningAdults, diningChildren, router, searchParams]);

  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const roomLabel = label(room);
  const occupancyLabel = getOccupancyLabel(roomLabel);
  const maxOccupancy = getMaxOccupancy({ resortCode: meta?.code, roomLabel });
  const totalGuests = adultGuests + childGuests + infantGuests;
  const occupancyExceeded = totalGuests > maxOccupancy;
  const occupancySuggestion = suggestNextVillaType(roomLabel);
  const studioHelperText = getStudioHelperText({ resortCode: meta?.code, roomLabel });

  function runSingle() {
    if (occupancyExceeded) {
      occupancyWarningRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setErr("Please choose a villa that accommodates your party size.");
      return;
    }
    setLoading(true);
    setErr(null);
    setRes(null);
    try {
      const data = quoteStay({ resortCode: resort, room, view, checkIn, nights });
      setRes(data);
    } catch (error: any) {
      setErr(error.message || "Unable to calculate right now.");
    } finally {
      setLoading(false);
    }
  }

  const [tableRows, setTableRows] = useState<any[]>([]);

  function selectFromCompare(resortCode: string, roomType: RoomCode) {
    const selectedResort = Resorts.find((item) => item.code === resortCode);
    if (!selectedResort) return;

    setMode("single");
    setResort(resortCode);
    setRoom(roomType);
    const firstView = (selectedResort.viewsByRoom[roomType]?.[0] || "S") as ViewCode;
    setView(firstView);

    setLoading(true);
    setErr(null);
    try {
      const data = quoteStay({ resortCode, room: roomType, view: firstView, checkIn, nights });
      setRes(data);
    } catch (error: any) {
      setErr(error.message || "Unable to calculate right now.");
    } finally {
      setLoading(false);
    }
  }

  function runCompare() {
    setLoading(true);
    setErr(null);
    setTableRows([]);
    try {
      const all = Resorts.map((item) => {
        const values: any = {};
        for (const roomType of item.roomTypes) {
          const viewCode = (item.viewsByRoom[roomType]?.[0] || "S") as ViewCode;
          try {
            const quote = quoteStay({ resortCode: item.code, room: roomType, view: viewCode, checkIn, nights });
            values[roomType] = { points: quote.totalPoints, totalUSD: quote.totalUSD };
          } catch {
            values[roomType] = null;
          }
        }
        return { resortCode: item.code, resortName: item.name, values, roomTypes: item.roomTypes };
      });
      all.sort((a, b) => a.resortName.localeCompare(b.resortName));
      setTableRows(all);
    } catch (error: any) {
      setErr(error.message || "Unable to calculate right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl rounded-3xl border border-[#0F2148]/10 bg-white/90 p-6 shadow-[0_30px_80px_rgba(15,33,72,0.12)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#0F2148]/50">PixieDVC Calculator</p>
          <h2 className="mt-2 font-display text-2xl text-[#0F2148]">Estimate points & pricing</h2>
        </div>
        <div className="flex gap-2 rounded-full border border-[#0F2148]/15 bg-white/70 p-1">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`rounded-full px-4 py-1 text-sm font-semibold transition ${
              mode === "single" ? "bg-[#0F2148] text-white" : "text-[#0F2148]/70"
            }`}
          >
            Single stay
          </button>
          <button
            type="button"
            onClick={() => setMode("compare")}
            className={`rounded-full px-4 py-1 text-sm font-semibold transition ${
              mode === "compare" ? "bg-[#0F2148] text-white" : "text-[#0F2148]/70"
            }`}
          >
            Compare resorts
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_2fr]">
        <div>
          <label className="text-sm font-semibold text-[#0F2148]">Check-in date</label>
          <input
            type="date"
            className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-[#0F2148]">Nights</label>
          <input
            type="range"
            min={1}
            max={14}
            className="mt-2 w-full accent-[#0F2148]"
            value={nights}
            onChange={(event) => setNights(Number(event.target.value))}
          />
          <div className="text-xs text-[#0F2148]/60">{nights} night(s)</div>
        </div>
      </div>

      {mode === "single" ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-[#0F2148]">Resort</label>
              <select
                className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
                value={resort}
                onChange={(event) => setResort(event.target.value)}
              >
                {Resorts.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-[#0F2148]">Room</label>
              <select
                className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
                value={room}
                onChange={(event) => setRoom(event.target.value as RoomCode)}
              >
                {meta.roomTypes.map((rt) => (
                  <option key={rt} value={rt}>
                    {label(rt)}
                  </option>
                ))}
              </select>
              {maxOccupancy !== null ? (
                <div className="mt-2 flex items-center justify-between text-sm text-[#0F2148]/70">
                  <span>Sleeps up to {maxOccupancy} guests</span>
                  <Link href="/help/occupancy" className="text-xs font-semibold text-[#0F2148] hover:underline">
                    How occupancy works
                  </Link>
                </div>
              ) : null}
              {studioHelperText ? (
                <div className="mt-1 text-xs text-[#0F2148]/60">{studioHelperText}</div>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-semibold text-[#0F2148]">View</label>
              <select
                className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
                value={view}
                onChange={(event) => setView(event.target.value as ViewCode)}
              >
                {roomViews.map((v) => (
                  <option key={v} value={v}>
                    {meta.viewNames[v]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 rounded-3xl border border-[#0F2148]/10 bg-white/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-[#0F2148]">Party size</label>
              <span className="text-xs text-[#0F2148]/60">
                Disney counts all guests toward room occupancy, including infants.
              </span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0F2148]/60">Adults (18+)</label>
                <input
                  type="number"
                  min={0}
                  className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
                  value={adultGuests}
                  onChange={(event) => setAdultGuests(Math.max(0, Number(event.target.value)))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0F2148]/60">Children (3–17)</label>
                <input
                  type="number"
                  min={0}
                  className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
                  value={childGuests}
                  onChange={(event) => setChildGuests(Math.max(0, Number(event.target.value)))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0F2148]/60">Infants (0–2)</label>
                <input
                  type="number"
                  min={0}
                  className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
                  value={infantGuests}
                  onChange={(event) => setInfantGuests(Math.max(0, Number(event.target.value)))}
                />
              </div>
            </div>
            <div className="mt-3 text-sm text-[#0F2148]/70">
              Total guests: <span className="font-semibold text-[#0F2148]">{totalGuests}</span>
            </div>
            {occupancyExceeded ? (
              <div
                ref={occupancyWarningRef}
                className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/60 p-4 text-sm text-amber-900"
              >
                Your selected villa sleeps up to {maxOccupancy} guests. Your party size is {totalGuests}. We recommend
                a {occupancySuggestion} for a comfortable fit.
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={runSingle}
            disabled={loading}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[#0F2148] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#1a2b5e]"
          >
            {loading ? "Calculating…" : "Get estimate"}
          </button>

          {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}
          {res ? (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Stat label="Total Points" value={res.totalPoints} />
                <Stat label={`${res.pricingTier} @ $${res.pppUSD}/pt`} value={`$${res.totalUSD.toLocaleString()}`} />
              </div>

              <div className="mt-8 rounded-2xl border border-[#0F2148]/10 bg-white px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#0F2148]/60">Dining Plan (Optional)</p>
                    <p className="text-sm text-[#0F2148]/70">
                      Would you be interested in adding a dining plan to your reservation?
                    </p>
                  </div>
                  <Link
                    href="/dining-plan"
                    className="text-sm font-medium text-[#0F2148]/70 hover:underline"
                  >
                    What is the Dining Plan?
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setDiningInterested(false)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      diningInterested
                        ? "border-[#0F2148]/20 text-[#0F2148]/60"
                        : "border-[#0F2148] text-[#0F2148]"
                    }`}
                  >
                    No, not interested
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiningInterested(true)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      diningInterested
                        ? "border-[#0F2148] bg-[#0F2148] text-white"
                        : "border-[#0F2148]/20 text-[#0F2148]/60"
                    }`}
                  >
                    Yes, show dining plan options
                  </button>
                </div>

                {diningInterested ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-[#0F2148]">Plan</label>
                      <select
                        className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
                        value={diningPlan}
                        onChange={(event) => setDiningPlan(event.target.value as DiningPlanKey)}
                      >
                        <option value="quick">{DINING_PLAN_LABELS.quick}</option>
                        <option value="standard">{DINING_PLAN_LABELS.standard}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-[#0F2148]">Adults (10+)</label>
                      <input
                        type="number"
                        min={0}
                        className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
                        value={diningAdults}
                        onChange={(event) => setDiningAdults(Math.max(0, Number(event.target.value)))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-[#0F2148]">Children (3–9)</label>
                      <input
                        type="number"
                        min={0}
                        className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
                        value={diningChildren}
                        onChange={(event) => setDiningChildren(Math.max(0, Number(event.target.value)))}
                      />
                    </div>

                    <div className="md:col-span-4 space-y-1 text-sm text-[#0F2148]/75">
                      <p>
                        Estimated dining plan cost for your stay:{" "}
                        <span className="font-semibold text-[#0F2148]">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          }).format(
                            calculateDiningTotal({
                              nights,
                              plan: diningPlan,
                              adults: diningAdults,
                              children: diningChildren,
                            }),
                          )}
                        </span>
                      </p>
                      <p className="text-xs text-[#0F2148]/60">
                        Dining Plans are added after your reservation is secured; final pricing is set by Disney and may
                        change.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 rounded-3xl border border-[#0F2148]/15 bg-[#0F2148]/5 p-6">
                <h3 className="text-lg font-semibold text-[#0F2148]">Your stay summary</h3>
                <div className="mt-4 space-y-4 text-sm text-[#0F2148]/80">
                  <SummaryRow icon={BuildingOffice2Icon} label="Resort" value={meta.name} />
                  <SummaryRow
                    icon={CalendarDaysIcon}
                    label="Dates"
                    value={`${new Date(checkIn).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })} — ${nights} night${nights !== 1 ? "s" : ""}`}
                  />
                  <SummaryRow
                    icon={HomeIcon}
                    label="Accommodation"
                    value={`${label(room)}, ${meta.viewNames[view]}`}
                    badge={meta.occupancy?.[room]}
                  />
                  {maxOccupancy !== null ? (
                    <div className="flex items-start gap-3">
                      <UserGroupIcon className="h-5 w-5 text-[#0F2148]" />
                      <div className="flex-1">
                        <div className="text-xs uppercase tracking-[0.2em] text-[#0F2148]/60">Occupancy</div>
                        <div className="mt-1 text-sm text-[#0F2148]">
                          {occupancyLabel ? `${occupancyLabel} • ` : ""}Sleeps up to {maxOccupancy} • Party size: {totalGuests}
                        </div>
                        {!occupancyExceeded ? (
                          <div className="mt-1 text-xs font-semibold text-emerald-700">
                            Your party size fits this villa type.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <SummaryRow icon={SparklesIcon} label="Season" value={res.pricingTier} />
                  <SummaryRow
                    icon={BanknotesIcon}
                    label="Cost"
                    value={`${res.totalPoints} points × $${res.pppUSD} = $${res.totalUSD.toLocaleString()}`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (occupancyExceeded) {
                      occupancyWarningRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      setErr("Please choose a villa that accommodates your party size.");
                      return;
                    }
                    router.push(appendRefToUrl("/stay-builder", ref));
                  }}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#0F2148] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1a2b5e]"
                >
                  Continue to booking
                </button>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={runCompare}
            disabled={loading}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[#0F2148] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#1a2b5e]"
          >
            {loading ? "Calculating…" : "Compare all resorts"}
          </button>
          {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}
          {tableRows.length ? (
            <div className="mt-6">
              <ResultsTable rows={tableRows} onReserve={(code, roomType) => selectFromCompare(code, roomType as RoomCode)} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#0F2148]/10 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-[0.2em] text-[#0F2148]/60">{label}</div>
      <div className="mt-2 text-xl font-semibold text-[#0F2148]">{value}</div>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  badge?: number | string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-[#0F2148]" />
      <div className="flex-1">
        <div className="text-xs uppercase tracking-[0.2em] text-[#0F2148]/60">{label}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#0F2148]">
          <span>{value}</span>
          {badge ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0F2148]/10 px-2 py-0.5 text-xs font-semibold text-[#0F2148]">
              <UserGroupIcon className="h-4 w-4" />
              {badge}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function label(room: string) {
  switch (room) {
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
      return room;
  }
}

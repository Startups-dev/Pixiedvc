"use client";

import { useMemo, useState } from "react";

import {
  FEE_PER_POINT,
  computeCapsForStay,
  formatDollarsFromCents,
} from "@/lib/ready-stays/pricingEngine";

type ResortOption = { id: string; name: string; calculator_code: string | null };

function seasonLabel(season: string) {
  switch (season) {
    case "christmas":
      return "Christmas";
    case "halloween":
      return "Halloween";
    case "marathon":
      return "Marathon";
    case "spring_break":
      return "Spring Break";
    case "high":
      return "High Season";
    default:
      return "Normal";
  }
}

function dollarsToCents(value: number) {
  return Math.round(value * 100);
}

function clampSuggestedOwnerPayouts(maxOwnerPayoutDollars: number) {
  const base = [
    { v: 16, label: "Sells fast" },
    { v: 18, label: "Strong" },
    { v: 20, label: "Premium" },
    { v: 22, label: "Top end" },
  ];

  const out = base
    .map((item) => ({ ...item, v: Math.min(item.v, maxOwnerPayoutDollars) }))
    .filter((item) => item.v > 0);

  const seen = new Set<number>();
  return out.filter((item) => (seen.has(item.v) ? false : (seen.add(item.v), true)));
}

export default function PricingIntelligenceClient({ resorts }: { resorts: ResortOption[] }) {
  const [resortId, setResortId] = useState<string>(resorts[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [points, setPoints] = useState("100");
  const [mode, setMode] = useState<"strictest" | "average">("strictest");
  const [ownerPayout, setOwnerPayout] = useState("18");

  const selectedResort = useMemo(
    () => resorts.find((resort) => resort.id === resortId) ?? null,
    [resorts, resortId],
  );

  const caps = useMemo(() => {
    if (!checkIn) return null;
    return computeCapsForStay({
      checkIn,
      checkOut: checkOut || null,
      resortCalculatorCode: selectedResort?.calculator_code ?? null,
    });
  }, [checkIn, checkOut, selectedResort?.calculator_code]);

  const capCents = useMemo(() => {
    if (!caps) return 0;
    return mode === "strictest" ? caps.strictestCapCents : caps.averageCapCents;
  }, [caps, mode]);

  const maxOwnerPayoutCents = useMemo(() => {
    if (!caps) return 0;
    return mode === "strictest"
      ? caps.maxOwnerPayoutStrictestCents
      : caps.maxOwnerPayoutAverageCents;
  }, [caps, mode]);

  const maxOwnerPayoutDollars = maxOwnerPayoutCents / 100;

  const suggestions = useMemo(
    () => clampSuggestedOwnerPayouts(maxOwnerPayoutDollars),
    [maxOwnerPayoutDollars],
  );

  const ownerPayoutNum = Number(ownerPayout);
  const ownerPayoutValid = Number.isFinite(ownerPayoutNum) && ownerPayoutNum > 0;

  const guestPaysPerPoint = ownerPayoutValid ? ownerPayoutNum + FEE_PER_POINT : null;

  const pointsNum = Number(points);
  const pointsValid = Number.isFinite(pointsNum) && pointsNum > 0;

  const totalGuestCents =
    guestPaysPerPoint !== null && pointsValid ? dollarsToCents(guestPaysPerPoint * pointsNum) : null;

  const totalOwnerCents =
    ownerPayoutValid && pointsValid ? dollarsToCents(ownerPayoutNum * pointsNum) : null;

  const overCap =
    caps && ownerPayoutValid ? dollarsToCents(ownerPayoutNum) > maxOwnerPayoutCents : false;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Resort
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              value={resortId}
              onChange={(event) => setResortId(event.target.value)}
            >
              {resorts.map((resort) => (
                <option key={resort.id} value={resort.id}>
                  {resort.name} {resort.calculator_code ? `(${resort.calculator_code})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Points
            <input
              type="number"
              min="1"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Check-in
            <input
              type="date"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Check-out
            <input
              type="date"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Cap calculation mode
          </p>
          <button
            type="button"
            onClick={() => setMode("strictest")}
            className={`rounded-full border px-4 py-2 text-xs font-semibold ${
              mode === "strictest"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Strictest (enforcement-safe)
          </button>
          <button
            type="button"
            onClick={() => setMode("average")}
            className={`rounded-full border px-4 py-2 text-xs font-semibold ${
              mode === "average"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Average (week smoothing)
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {!caps ? (
            <p className="text-slate-500">Pick dates to compute caps.</p>
          ) : (
            <div className="space-y-2">
              <p>
                <span className="font-semibold">Strictest season:</span>{" "}
                {seasonLabel(caps.strictestSeasonType)}
              </p>
              <p>
                <span className="font-semibold">Guest cap /pt:</span>{" "}
                {formatDollarsFromCents(capCents)}
              </p>
              <p>
                <span className="font-semibold">Pixie fee /pt:</span> ${FEE_PER_POINT}
              </p>
              <p>
                <span className="font-semibold">Max owner payout /pt:</span>{" "}
                {formatDollarsFromCents(maxOwnerPayoutCents)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Owner payout simulator
            </p>
            <h2 className="text-lg font-semibold text-ink">Choose payout, see guest price</h2>
          </div>
        </div>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Owner payout per point
          <input
            type="number"
            min="1"
            step="0.01"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            value={ownerPayout}
            onChange={(event) => setOwnerPayout(event.target.value)}
          />
        </label>

        {caps && suggestions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <button
                key={item.v}
                type="button"
                onClick={() => setOwnerPayout(String(item.v))}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300"
              >
                ${item.v}/pt · {item.label}
              </button>
            ))}
          </div>
        ) : null}

        {overCap ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            This payout is above the maximum allowed for these dates in this resort.
            <div className="mt-2 text-xs text-rose-700">
              Fix: lower owner payout to {formatDollarsFromCents(maxOwnerPayoutCents)} or below.
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            Owner receives:{" "}
            <span className="font-semibold">
              {ownerPayoutValid ? `$${ownerPayoutNum.toFixed(2)}/pt` : "—"}
            </span>
          </p>
          <p>Pixie fee: ${FEE_PER_POINT}/pt</p>
          <p>
            Guest pays:{" "}
            <span className="font-semibold">
              {guestPaysPerPoint !== null ? `$${guestPaysPerPoint.toFixed(2)}/pt` : "—"}
            </span>
          </p>
          <p>
            Total guest price:{" "}
            <span className="font-semibold">
              {totalGuestCents !== null ? formatDollarsFromCents(totalGuestCents) : "—"}
            </span>
          </p>
          <p>
            Total owner payout:{" "}
            <span className="font-semibold">
              {totalOwnerCents !== null ? formatDollarsFromCents(totalOwnerCents) : "—"}
            </span>
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <details>
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.2em] text-ink">
            Night-by-night cap breakdown
          </summary>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-4 py-3 font-semibold">Night</th>
                  <th className="px-4 py-3 font-semibold">Season</th>
                  <th className="px-4 py-3 font-semibold">Base cap</th>
                  <th className="px-4 py-3 font-semibold">Resort mod</th>
                  <th className="px-4 py-3 font-semibold">Final cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(caps?.nights ?? []).map((night) => (
                  <tr key={night.night}>
                    <td className="px-4 py-3 text-ink">{night.night}</td>
                    <td className="px-4 py-3 text-slate-600">{seasonLabel(night.seasonType)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDollarsFromCents(night.baseCapCents)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDollarsFromCents(night.resortModifierCents)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatDollarsFromCents(night.finalCapCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Note: Strictest = lowest cap across nights (safest enforcement). Average = mean across nights (smooths holiday peaks).
          </p>
        </details>
      </div>
    </div>
  );
}

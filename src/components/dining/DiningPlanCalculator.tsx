"use client";

import { useMemo, useState } from "react";

import {
  DINING_PLAN_LABELS,
  type DiningPlanKey,
  calculateDiningTotal,
} from "@/lib/diningPlanPricing";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function DiningPlanCalculator() {
  const [interested, setInterested] = useState(false);
  const [plan, setPlan] = useState<DiningPlanKey>("quick");
  const [nights, setNights] = useState(5);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const total = useMemo(() => {
    return calculateDiningTotal({
      plan,
      nights: Math.max(0, nights),
      adults: Math.max(0, adults),
      children: Math.max(0, children),
    });
  }, [adults, children, nights, plan]);

  return (
    <div className="rounded-2xl border border-[#0F2148]/10 bg-white px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#0F2148]/60">Dining Plan Calculator</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setInterested((value) => !value)}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            interested ? "border-[#0F2148] bg-[#0F2148] text-white" : "border-[#0F2148]/20 text-[#0F2148]/60"
          }`}
        >
          Dining Plan Cost
        </button>
      </div>

      {interested ? (
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-[#0F2148]">Plan</label>
            <select
              className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
              value={plan}
              onChange={(event) => setPlan(event.target.value as DiningPlanKey)}
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
              value={adults}
              onChange={(event) => setAdults(Math.max(0, Number(event.target.value) || 0))}
              className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-[#0F2148]">Children (3–9)</label>
            <input
              type="number"
              min={0}
              value={children}
              onChange={(event) => setChildren(Math.max(0, Number(event.target.value) || 0))}
              className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-[#0F2148]">Nights</label>
            <input
              type="number"
              min={1}
              value={nights}
              onChange={(event) => setNights(Math.max(1, Number(event.target.value) || 1))}
              className="mt-2 w-full rounded-2xl border border-[#0F2148]/20 bg-white px-3 py-2 text-sm text-[#0F2148]"
            />
          </div>

          <div className="space-y-1 text-sm text-[#0F2148]/75 md:col-span-4">
            <p>
              Estimated dining plan cost for your stay:{" "}
              <span className="font-semibold text-[#0F2148]">{formatCurrency(total)}</span>
            </p>
            <p className="text-xs text-[#0F2148]/60">
              Dining Plans can be added after your reservation is secured by the DVC owner upon request and it will
              require your credit card information. For more details contact Pixie DVC concierge.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

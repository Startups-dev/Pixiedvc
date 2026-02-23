"use client";

import Link from "next/link";
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
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ReadyStayDiningPlanSection({
  nights,
  stayTotalCents,
  initialAdults,
  initialChildren,
}: {
  nights: number;
  stayTotalCents: number | null;
  initialAdults: number;
  initialChildren: number;
}) {
  const [interested, setInterested] = useState(false);
  const [plan, setPlan] = useState<DiningPlanKey>("quick");
  const [adults, setAdults] = useState(Math.max(0, initialAdults));
  const [children, setChildren] = useState(Math.max(0, initialChildren));

  const diningTotal = useMemo(() => {
    if (!interested || nights <= 0) return 0;
    return calculateDiningTotal({
      nights,
      plan,
      adults,
      children,
    });
  }, [adults, children, interested, nights, plan]);

  const stayTotal = stayTotalCents ? stayTotalCents / 100 : 0;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dining Plan (Optional)</p>
          <p className="text-sm text-slate-700">Would you be interested in adding a dining plan to your reservation?</p>
        </div>
        <Link href="/dining-plan" className="text-sm font-medium text-slate-700 hover:underline">
          What is the Dining Plan?
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setInterested(false)}
          className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
            interested ? "border-slate-300 text-slate-500" : "border-slate-900 text-slate-900"
          }`}
        >
          No, not interested
        </button>
        <button
          type="button"
          onClick={() => setInterested(true)}
          className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
            interested
              ? "border-indigo-700 bg-indigo-700 text-white"
              : "border-slate-300 text-slate-500"
          }`}
        >
          Yes, show dining plan options
        </button>
      </div>

      {interested ? (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Plan</label>
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value as DiningPlanKey)}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="quick">{DINING_PLAN_LABELS.quick}</option>
              <option value="standard">{DINING_PLAN_LABELS.standard}</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Adults (10+)</label>
            <input
              type="number"
              min={0}
              value={adults}
              onChange={(event) => setAdults(Math.max(0, Number(event.target.value) || 0))}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Children (3–9)</label>
            <input
              type="number"
              min={0}
              value={children}
              onChange={(event) => setChildren(Math.max(0, Number(event.target.value) || 0))}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div className="space-y-1 text-sm text-slate-700 md:col-span-4">
            <p>
              Estimated dining plan cost: <span className="font-semibold text-slate-900">{formatCurrency(diningTotal)}</span>{" "}
              <span className="text-slate-500">(to be confirmed)</span>
            </p>
            <p>
              Estimated stay total: <span className="font-semibold text-slate-900">{formatCurrency(stayTotal)}</span>
            </p>
            <p>
              Estimated stay + dining total: <span className="font-semibold text-slate-900">{formatCurrency(stayTotal + diningTotal)}</span>
            </p>
            <p className="text-slate-500">
              Dining Plans are added after your reservation is secured; final pricing is set by Disney and may change.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

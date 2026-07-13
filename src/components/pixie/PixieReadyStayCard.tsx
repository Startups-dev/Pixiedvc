"use client";

import Link from "next/link";

import { trackPixieEvent } from "@/lib/pixie/client/analytics";
import type { PixieReadyStayMatch } from "@/lib/pixie/ready-stays/types";

function formatCents(cents?: number) {
  if (typeof cents !== "number") return "Price unavailable";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function label(classification: PixieReadyStayMatch["classification"]) {
  switch (classification) {
    case "exact_match":
      return "Exact match";
    case "flexible_date_match":
      return "Flexible-date option";
    case "near_date_match":
      return "Nearby-date option";
    case "partial_overlap":
      return "Partial overlap";
    case "resort_preference_match":
      return "Resort preference option";
    case "budget_match":
      return "Budget match";
    default:
      return "Alternative";
  }
}

function fitLabel(classification: PixieReadyStayMatch["classification"]) {
  switch (classification) {
    case "exact_match":
      return "Exact option";
    case "flexible_date_match":
      return "Flexible option";
    case "near_date_match":
      return "Nearby option";
    case "partial_overlap":
      return "Incomplete stay";
    default:
      return "Option";
  }
}

export default function PixieReadyStayCard({ match }: { match: PixieReadyStayMatch }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label(match.classification)}</p>
          <h3 className="mt-1 text-sm font-semibold text-ink">{match.resortDisplayName}</h3>
          <p className="text-xs text-slate-600">{match.roomDisplayName}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{fitLabel(match.classification)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-white p-2">
          <span className="block text-slate-400">Dates</span>
          <span className="font-semibold text-slate-700">
            {match.arrivalDate} to {match.departureDate}
          </span>
        </div>
        <div className="rounded-lg bg-white p-2">
          <span className="block text-slate-400">Listing price</span>
          <span className="font-semibold text-slate-700">{formatCents(match.listingPrice?.totalCents)}</span>
        </div>
        <div className="rounded-lg bg-white p-2">
          <span className="block text-slate-400">Sleeps</span>
          <span className="font-semibold text-slate-700">{match.sleeps}</span>
        </div>
        <div className="rounded-lg bg-white p-2">
          <span className="block text-slate-400">Fit</span>
          <span className="font-semibold text-slate-700">{match.budgetFit.budgetStatus.replace(/_/g, " ")}</span>
        </div>
      </div>
      {match.dateMatch.requiresDateChange || match.dateMatch.partialStayOnly ? (
        <p className="mt-2 text-xs leading-5 text-amber-800">
          {match.dateMatch.partialStayOnly ? "Partial overlap only; this is not a full trip match." : "Requires a date change."}
        </p>
      ) : null}
      {match.isTestListing ? <p className="mt-2 text-xs font-semibold text-slate-500">Visible test listing</p> : null}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] leading-5 text-slate-500">Inventory and price require recheck.</p>
        <Link
          href={match.bookingPath}
          onClick={() =>
            trackPixieEvent("pixie_ready_stay_clicked", {
              listingId: match.listingId,
              classification: match.classification,
            })
          }
          className="shrink-0 rounded-full bg-[#0f2148] px-3 py-2 text-xs font-semibold text-white"
        >
          Review Ready Stay
        </Link>
      </div>
    </article>
  );
}

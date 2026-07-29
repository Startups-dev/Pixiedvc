"use client";

import { RotateCcw } from "lucide-react";

import PixiePortrait from "@/components/pixie/PixiePortrait";
import type { PixieChatState } from "@/lib/pixie/client/types";

export default function PixieHeader({
  state,
  enabled,
  onResetClick,
}: {
  state: PixieChatState;
  enabled: boolean;
  onResetClick: () => void;
}) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <PixiePortrait compact />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ask Hara</p>
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">Walt Disney World planning workspace</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Hara helps you compare resorts, dates, and travel priorities inside HannaDVC. HannaDVC is not Disney or an official Disney representative.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
          {enabled ? state.tripState.planningStage.replace(/_/g, " ") : "not enabled"}
        </span>
        <button
          type="button"
          onClick={onResetClick}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Start over
        </button>
      </div>
    </header>
  );
}

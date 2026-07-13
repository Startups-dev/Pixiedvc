import type { PixieCompletenessResult } from "@/lib/pixie/types";

const milestones = [
  { key: "ask_dates", label: "Dates" },
  { key: "ask_party", label: "Travelers" },
  { key: "ask_budget_context", label: "Budget" },
  { key: "ask_trip_priorities", label: "Preferences" },
  { key: "ask_resort_choice", label: "Resort match" },
  { key: "ask_park_days", label: "Trip outline" },
] as const;

export default function PixieProgress({ completeness }: { completeness: PixieCompletenessResult }) {
  const missing = new Set([...completeness.missingRequired, ...completeness.missingRecommended]);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Planning progress</h2>
          <p className="text-xs text-slate-500">Completeness, not booking probability.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{completeness.score}%</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {milestones.map((milestone) => {
          const done = !missing.has(milestone.key);
          return (
            <div key={milestone.key} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <span className={`h-2.5 w-2.5 rounded-full ${done ? "bg-emerald-500" : "bg-slate-300"}`} />
              {milestone.label}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-600">
        {completeness.readyForResortRecommendations ? "Ready to explore resorts" : "Plan taking shape"}
      </p>
    </section>
  );
}


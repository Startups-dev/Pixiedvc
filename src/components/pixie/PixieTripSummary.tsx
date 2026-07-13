import PixieTravellerSummary from "@/components/pixie/PixieTravellerSummary";
import type { PixieTripState } from "@/lib/pixie/schema";

function formatBudget(state: PixieTripState) {
  if (!state.budget.amountCents) return "Not set";
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: state.budget.currency ?? "USD",
    maximumFractionDigits: 0,
  }).format(state.budget.amountCents / 100);
  return `${amount} (${state.budget.budgetType.replace(/_/g, " ")})`;
}

export default function PixieTripSummary({ state }: { state: PixieTripState }) {
  const dates =
    state.dates.arrivalDate && state.dates.departureDate
      ? `${state.dates.arrivalDate} to ${state.dates.departureDate}`
      : state.dates.flexibleDates
        ? "Flexible dates"
        : "Not set";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">Trip summary</h2>
      <dl className="mt-3 grid gap-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Destination</dt>
          <dd className="mt-1 text-slate-700">Walt Disney World</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Dates</dt>
          <dd className="mt-1 text-slate-700">
            {dates}
            {state.dates.numberOfNights ? ` · ${state.dates.numberOfNights} nights` : ""}
          </dd>
        </div>
        <PixieTravellerSummary state={state} />
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Budget context</dt>
          <dd className="mt-1 text-slate-700">{formatBudget(state)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Priorities</dt>
          <dd className="mt-1 text-slate-700">
            {[...state.preferences.parkPriorities, ...state.preferences.resortPriorities].slice(0, 5).join(", ") || "Not set"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Pace</dt>
          <dd className="mt-1 text-slate-700">{state.preferences.vacationPace.replace(/_/g, " ")}</dd>
        </div>
      </dl>
    </section>
  );
}


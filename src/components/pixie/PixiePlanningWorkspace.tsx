import type { PixieTripState } from "@/lib/pixie/schema";

function isPortugueseState(state: PixieTripState) {
  return /\b(vamos|ficar|festa|filha|marido|hospedagem|jantar)\b/i.test(
    [state.dates.dateNotes, state.party.partyNotes, state.preferences.generalNotes, ...state.preferences.resortPriorities, ...state.preferences.parkPriorities].filter(Boolean).join(" "),
  );
}

function formatStatus(value: string, pt = false) {
  const labels: Record<string, string> = pt
    ? {
        confirmed: "confirmado",
        selected: "planejado",
        planned: "planejado",
        considering: "considerando",
        recommended: "recomendado",
        needs_decision: "decidir",
        unknown: "indefinido",
        needs_account_specific_verification: "verificar",
      }
    : {};
  return labels[value] ?? value.replace(/_/g, " ");
}

function formatPoints(points?: number) {
  return typeof points === "number" ? ` · ${points} pts` : "";
}

function formatUsd(cents?: number) {
  return typeof cents === "number" ? `$${Math.round(cents / 100).toLocaleString("en-US")}` : undefined;
}

export default function PixiePlanningWorkspace({ state }: { state: PixieTripState }) {
  const pt = isPortugueseState(state);
  const itinerary = state.planningWorkspace.workingItinerary;
  const unresolved = itinerary.filter((night) => night.status === "unresolved");
  const decisions = state.planningWorkspace.activeDecisions.filter((decision) => decision.status !== "resolved");
  const lodging = state.planningWorkspace.lodgingPlans;
  const parks = state.planningWorkspace.parkPlans;
  const dining = state.planningWorkspace.diningPlans;
  const activities = state.planningWorkspace.activityPlans;
  const attention = state.planningWorkspace.attentionItems.filter((item) => item.status !== "resolved");
  const dvc = state.dvcContext;
  const hasDvcContext =
    dvc.lodgingContext === "dvc_points" ||
    dvc.useYear ||
    dvc.currentUseYearPoints ||
    dvc.nextUseYearPoints ||
    dvc.borrowingContemplated ||
    dvc.planningRisks.length > 0;
  const availability = state.planningWorkspace.availabilityObservations;

  if (!itinerary.length && !decisions.length && !hasDvcContext && !availability.length && !lodging.length && !parks.length && !dining.length && !activities.length && !attention.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">{pt ? "Plano da viagem" : "Planning workspace"}</h2>

      {lodging.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{pt ? "Hospedagem" : "Lodging"}</h3>
          <div className="mt-2 space-y-2">
            {lodging.map((plan) => (
              <div key={plan.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{plan.resort}</p>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-600">{formatStatus(plan.status, pt)}</span>
                </div>
                {plan.checkIn || plan.checkOut || plan.startDate || plan.endDate ? <p className="mt-1 text-xs text-slate-500">{[plan.checkIn ?? plan.startDate, plan.checkOut ?? plan.endDate].filter(Boolean).join(pt ? " a " : " to ")}</p> : null}
                {plan.roomType ? <p className="mt-1 text-xs leading-5 text-slate-500">{plan.roomType}</p> : null}
                {plan.numberOfNights || plan.estimatedPoints || plan.estimatedRentalCostCents ? (
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {[
                      plan.numberOfNights ? `${plan.numberOfNights} ${pt ? (plan.numberOfNights === 1 ? "noite" : "noites") : plan.numberOfNights === 1 ? "night" : "nights"}` : undefined,
                      plan.estimatedPoints ? `${plan.estimatedPoints} ${pt ? "pontos estimados" : "points est."}` : undefined,
                      formatUsd(plan.estimatedRentalCostCents) ? `${pt ? "Est." : "Est."} ${formatUsd(plan.estimatedRentalCostCents)}` : undefined,
                    ].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {plan.note ? <p className="mt-1 text-xs leading-5 text-slate-500">{plan.note}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {parks.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{pt ? "Parques" : "Park plans"}</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {parks.map((plan) => (
              <li key={plan.id}>
                <span className="font-semibold text-ink">{plan.date ? `${plan.date} · ` : ""}{plan.park}</span>
                <span className="text-slate-500"> · {formatStatus(plan.status, pt)}</span>
                {plan.note ? <span className="block text-xs leading-5 text-slate-500">{plan.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {dining.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{pt ? "Restaurantes" : "Dining plans"}</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {dining.map((plan) => (
              <li key={plan.id}>
                <span className="font-semibold text-ink">{plan.date ? `${plan.date} · ` : ""}{plan.mealPeriod ? `${plan.mealPeriod} · ` : ""}{plan.restaurant}</span>
                <span className="text-slate-500"> · {formatStatus(plan.status, pt)}</span>
                {plan.targetTime ? <span className="block text-xs leading-5 text-slate-500">{pt ? "Horário" : "Time"}: {plan.targetTime}</span> : null}
                {plan.planningPriceEstimate ? <span className="block text-xs leading-5 text-slate-500">{pt ? "Estimativa" : "Planning estimate"}: {plan.planningPriceEstimate}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {activities.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{pt ? "Atividades" : "Activities"}</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {activities.map((plan) => (
              <li key={plan.id}>{plan.date ? `${plan.date}: ` : ""}{plan.label} · {formatStatus(plan.status, pt)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {itinerary.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{pt ? "Roteiro em construção" : "Working itinerary"}</h3>
          <div className="mt-2 space-y-2">
            {itinerary.map((night) => (
              <div key={night.date} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{night.date}</p>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-600">
                    {formatStatus(night.status, pt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {night.resort ?? "Unresolved"}
                  {night.roomType ? ` ${night.roomType}` : ""}
                  {formatPoints(night.points)}
                </p>
                {night.rationale ? <p className="mt-1 text-xs leading-5 text-slate-500">{night.rationale}</p> : null}
                {night.alternatives.length ? (
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {pt ? "Alternativa" : "Alternative"}: {night.alternatives.map((option) => `${option.resort ?? (pt ? "Opção" : "Option")}${formatPoints(option.points)}`).join("; ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {unresolved.length || decisions.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{pt ? "Pendências" : "Open decisions"}</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {unresolved.map((night) => (
              <li key={`unresolved-${night.date}`}>{pt ? "Resolver" : "Resolve"} {night.date}</li>
            ))}
            {decisions.map((decision) => (
              <li key={decision.id}>
                <span className="font-semibold text-ink">{decision.label}</span>
                {decision.risk ? <span className="block text-xs leading-5 text-slate-500">{decision.risk}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {attention.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{pt ? "Atenção" : "Attention"}</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {attention.map((item) => (
              <li key={item.id}>
                <span className="font-semibold text-ink">{item.label}</span>
                {item.note ? <span className="block text-xs leading-5 text-slate-500">{item.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasDvcContext ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">DVC</h3>
          <dl className="mt-2 grid gap-2 text-sm text-slate-700">
            {dvc.useYear ? <div>{pt ? "Use Year" : "Use Year"}: {dvc.useYear}</div> : null}
            {dvc.currentUseYearPoints ? <div>{pt ? "Use Year atual" : "Current Use Year"}: {dvc.currentUseYearPoints.points} pts</div> : null}
            {dvc.nextUseYearPoints ? <div>{pt ? "Próximo Use Year" : "Next Use Year"}: {dvc.nextUseYearPoints.points} pts</div> : null}
            {dvc.borrowingContemplated ? <div>{pt ? "Empréstimo de pontos: em análise" : "Borrowing: being considered"}</div> : null}
            {dvc.holdingExposure?.notes ? <div className="text-xs leading-5 text-slate-500">{dvc.holdingExposure.notes}</div> : null}
          </dl>
        </div>
      ) : null}

      {availability.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{pt ? "Disponibilidade informada" : "Traveler-reported availability"}</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {availability.slice(0, 6).map((item) => (
              <li key={`${item.date}-${item.resort}-${item.roomType ?? "room"}-${item.source}`}>
                {item.date}: {item.resort}
                {item.roomType ? ` ${item.roomType}` : ""} · {formatStatus(item.status, pt)}
                {formatPoints(item.points)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

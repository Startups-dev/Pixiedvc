import type { PixieTripState } from "@/lib/pixie/schema";

function formatStatus(value: string) {
  return value.replace(/_/g, " ");
}

function formatPoints(points?: number) {
  return typeof points === "number" ? ` · ${points} pts` : "";
}

export default function PixiePlanningWorkspace({ state }: { state: PixieTripState }) {
  const itinerary = state.planningWorkspace.workingItinerary;
  const unresolved = itinerary.filter((night) => night.status === "unresolved");
  const decisions = state.planningWorkspace.activeDecisions.filter((decision) => decision.status !== "resolved");
  const dvc = state.dvcContext;
  const hasDvcContext =
    dvc.lodgingContext === "dvc_points" ||
    dvc.useYear ||
    dvc.currentUseYearPoints ||
    dvc.nextUseYearPoints ||
    dvc.borrowingContemplated ||
    dvc.planningRisks.length > 0;
  const availability = state.planningWorkspace.availabilityObservations;

  if (!itinerary.length && !decisions.length && !hasDvcContext && !availability.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">Planning workspace</h2>

      {itinerary.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Working itinerary</h3>
          <div className="mt-2 space-y-2">
            {itinerary.map((night) => (
              <div key={night.date} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{night.date}</p>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-600">
                    {formatStatus(night.status)}
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
                    Alternative: {night.alternatives.map((option) => `${option.resort ?? "Option"}${formatPoints(option.points)}`).join("; ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {unresolved.length || decisions.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Open decisions</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {unresolved.map((night) => (
              <li key={`unresolved-${night.date}`}>Resolve {night.date}</li>
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

      {hasDvcContext ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">DVC point context</h3>
          <dl className="mt-2 grid gap-2 text-sm text-slate-700">
            {dvc.useYear ? <div>Use Year: {dvc.useYear}</div> : null}
            {dvc.currentUseYearPoints ? <div>Current Use Year: {dvc.currentUseYearPoints.points} pts</div> : null}
            {dvc.nextUseYearPoints ? <div>Next Use Year: {dvc.nextUseYearPoints.points} pts</div> : null}
            {dvc.borrowingContemplated ? <div>Borrowing: being considered</div> : null}
            {dvc.holdingExposure?.notes ? <div className="text-xs leading-5 text-slate-500">{dvc.holdingExposure.notes}</div> : null}
          </dl>
        </div>
      ) : null}

      {availability.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Traveler-reported availability</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {availability.slice(0, 6).map((item) => (
              <li key={`${item.date}-${item.resort}-${item.roomType ?? "room"}-${item.source}`}>
                {item.date}: {item.resort}
                {item.roomType ? ` ${item.roomType}` : ""} · {formatStatus(item.status)}
                {formatPoints(item.points)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

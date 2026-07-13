import type { PixieTripState } from "@/lib/pixie/schema";

export default function PixieTravellerSummary({ state }: { state: PixieTripState }) {
  const total = state.party.totalPartySize ?? 0;
  const adultCount = state.party.adultCount ?? state.party.adults ?? 0;
  const childCount = state.party.childCount ?? state.party.children ?? 0;
  const ageGroups = state.party.ageGroupSummary
    ? Object.entries(state.party.ageGroupSummary)
        .filter(([, count]) => count > 0)
        .map(([group, count]) => `${count} ${group}`)
        .join(", ")
    : "";

  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Travelers</dt>
      <dd className="mt-1 text-slate-700">
        {total > 0 ? `${total} total · ${adultCount} adults · ${childCount} children` : "Not set"}
        {ageGroups ? <span className="block text-xs text-slate-500">{ageGroups}</span> : null}
      </dd>
    </div>
  );
}


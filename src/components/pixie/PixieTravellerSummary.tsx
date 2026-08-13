import type { PixieTripState } from "@/lib/pixie/schema";

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function PixieTravellerSummary({ state }: { state: PixieTripState }) {
  const total = state.party.totalPartySize;
  const adultCount = state.party.adultCount ?? state.party.adults;
  const childCount = state.party.childCount ?? state.party.children;
  const summaryParts = [
    total !== undefined && total > 0 ? pluralize(total, "total") : undefined,
    adultCount !== undefined ? pluralize(adultCount, "adult") : childCount !== undefined && childCount > 0 ? "adults unknown" : undefined,
    childCount !== undefined ? pluralize(childCount, "child", "children") : undefined,
  ].filter((part): part is string => Boolean(part));
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
        {summaryParts.length ? summaryParts.join(" · ") : "Not set"}
        {ageGroups ? <span className="block text-xs text-slate-500">{ageGroups}</span> : null}
      </dd>
    </div>
  );
}

import type { PixieTripState } from "@/lib/pixie/schema";

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function PixieTravellerSummary({ state }: { state: PixieTripState }) {
  const total = state.party.totalPartySize;
  const adultCount = state.party.adultCount ?? state.party.adults;
  const childCount = state.party.childCount ?? state.party.children;
  const childAges = state.party.travellers
    .filter((traveller) => traveller.ageGroup !== "adult" && typeof traveller.age === "number")
    .map((traveller) => traveller.age)
    .sort((a, b) => a - b);
  const childLabel = childAges.length === 1
    ? `1 child age ${childAges[0]}`
    : childAges.length > 1
      ? `${childAges.length} children ages ${childAges.join(", ")}`
      : childCount !== undefined
        ? pluralize(childCount, "child", "children")
        : undefined;
  const summaryParts = [
    total !== undefined && total > 0 ? pluralize(total, "total") : undefined,
    adultCount !== undefined ? pluralize(adultCount, "adult") : childCount !== undefined && childCount > 0 ? "adults unknown" : undefined,
    childLabel,
  ].filter((part): part is string => Boolean(part));

  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Travelers</dt>
      <dd className="mt-1 text-slate-700">
        {summaryParts.length ? summaryParts.join(" · ") : "Not set"}
      </dd>
    </div>
  );
}

import PixieReadyStayCard from "@/components/pixie/PixieReadyStayCard";
import type { PixieReadyStayMatchResult } from "@/lib/pixie/ready-stays/types";

export default function PixieReadyStayMatches({ matches }: { matches?: PixieReadyStayMatchResult }) {
  const groups = matches?.groups;
  const total = matches?.matches.length ?? 0;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Ready Stay matches</h2>
        <span className="text-xs text-slate-500">{total ? `${total} found` : "No matches yet"}</span>
      </div>
      {total ? (
        <div className="mt-3 space-y-4">
          <MatchGroup title="Exact matches" items={groups?.exact ?? []} />
          <MatchGroup title="Flexible-date matches" items={groups?.flexible ?? []} />
          <MatchGroup title="Other close options" items={groups?.alternatives ?? []} />
          <p className="text-[11px] leading-5 text-slate-500">Ready Stay price and availability must be rechecked before any booking action.</p>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-500">Hara can compare public Ready Stays after dates and party size are usable.</p>
      )}
    </section>
  );
}

function MatchGroup({ title, items }: { title: string; items: NonNullable<PixieReadyStayMatchResult["matches"]> }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</h3>
      {items.slice(0, 3).map((match) => (
        <PixieReadyStayCard key={match.matchId} match={match} />
      ))}
    </div>
  );
}

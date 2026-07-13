import PixieResortRecommendationCard from "@/components/pixie/PixieResortRecommendationCard";
import type { PixieRecommendationResult } from "@/lib/pixie/resorts/recommendation-service";

export default function PixieResortRecommendations({ recommendations }: { recommendations?: PixieRecommendationResult }) {
  const items = recommendations?.recommendations ?? [];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Resort matches</h2>
        <span className="text-xs text-slate-500">{items.length ? `${items.length} shown` : "Waiting for details"}</span>
      </div>
      <div className="mt-3 space-y-3">
        {items.length ? (
          items.map((item, index) => <PixieResortRecommendationCard key={item.recommendationId} recommendation={item} index={index} />)
        ) : (
          <p className="text-sm leading-6 text-slate-500">Share dates, travelers, and priorities to unlock trusted DVC resort matches.</p>
        )}
      </div>
    </section>
  );
}


import Image from "next/image";

import { resolveResortImage } from "@/lib/resort-image";
import type { PixieResortRecommendation } from "@/lib/pixie/resorts/recommendation-service";

function formatCents(cents?: number) {
  if (typeof cents !== "number") return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default function PixieResortRecommendationCard({
  recommendation,
  index,
}: {
  recommendation: PixieResortRecommendation;
  index: number;
}) {
  const image = resolveResortImage({ resortSlug: recommendation.resortSlug, imageIndex: index + 1 });
  const price = recommendation.estimatedGuestPrice?.supported
    ? formatCents(recommendation.estimatedGuestPrice.estimatedTotalCents)
    : null;
  const label = index === 0 ? "Strongest match" : index === 1 ? "Great alternative" : "Worth considering";
  const fitLabel = recommendation.score >= 75 ? "Strong fit" : recommendation.score >= 55 ? "Good fit" : "Possible fit";

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="relative h-28 w-full overflow-hidden bg-slate-100">
        <Image src={image.url} alt="" fill sizes="(min-width: 1024px) 360px, 100vw" className="object-cover" />
      </div>
      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <h3 className="mt-1 text-sm font-semibold text-ink">{recommendation.displayName}</h3>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{fitLabel}</span>
        </div>
        <p className="text-xs text-slate-600">
          Recommended room: <span className="font-semibold text-slate-800">{recommendation.recommendedRoomType.displayName}</span>
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-white p-2">
            <span className="block text-slate-400">Points</span>
            <span className="font-semibold text-slate-700">
              {recommendation.estimatedPoints?.supported ? `${recommendation.estimatedPoints.totalPoints} points` : "Unavailable"}
            </span>
          </div>
          <div className="rounded-lg bg-white p-2">
            <span className="block text-slate-400">Estimate</span>
            <span className="font-semibold text-slate-700">{price ?? "Not available"}</span>
          </div>
        </div>
        <ul className="space-y-1 text-xs leading-5 text-slate-600">
          {recommendation.explanationFragments.slice(0, 2).map((fragment) => (
            <li key={fragment}>• {fragment}</li>
          ))}
        </ul>
        {recommendation.tradeoffs[0] ? (
          <p className="text-xs leading-5 text-amber-800">
            <span className="font-semibold">Tradeoff:</span> {recommendation.tradeoffs[0]}
          </p>
        ) : null}
        {recommendation.warnings[0] ? (
          <p className="text-xs leading-5 text-slate-500">{recommendation.warnings[0]}</p>
        ) : null}
        <p className="text-[11px] leading-5 text-slate-500">
          Estimates are not confirmed availability. Final DVC availability is checked later.
        </p>
      </div>
    </article>
  );
}

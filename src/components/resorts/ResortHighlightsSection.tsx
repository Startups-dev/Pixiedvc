import { Check, Info } from "lucide-react";

import FavoriteResortToggle from "@/components/resort/FavoriteResortToggle";
import type { ResortHighlight } from "@/content/resortHighlights";

type Props = {
  highlight: ResortHighlight;
  resortName: string;
};

export default function ResortHighlightsSection({ highlight, resortName }: Props) {
  return (
    <section className="mt-10 rounded-3xl border border-[#0B1B3A]/10 bg-white p-6 shadow-[0_18px_50px_rgba(11,27,58,0.08)] sm:p-8">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-[#0B1B3A] sm:text-3xl">
          {highlight.title}
        </h2>
        <FavoriteResortToggle resortId={highlight.slug} resortName={resortName} />
      </div>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#0B1B3A]/75 sm:text-lg">
        {highlight.intro}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {highlight.bullets.map((bullet) => (
          <div
            key={bullet}
            className="flex items-start gap-3 rounded-xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.02] p-3"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0B1B3A]/60" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-[#0B1B3A]/85 sm:text-base">
              {bullet}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.035] p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-[#0B1B3A]/60" aria-hidden="true" />
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#BFA76A]">
            Good to know
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {highlight.goodToKnow.map((item) => (
            <div key={item} className="flex gap-2 text-sm text-[#0B1B3A]/70">
              <span className="mt-2 h-1 w-1 rounded-full bg-[#0B1B3A]/40" aria-hidden="true" />
              <p>{item}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-[#0B1B3A]/10 bg-gradient-to-r from-[#0B1B3A]/[0.05] to-transparent p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-[#0B1B3A]/75 sm:text-base">
          <span className="font-medium text-[#0B1B3A]/90">PixieDVC recommends</span>{" "}
          {highlight.recommendation.replace(/^PixieDVC recommends\s*/i, "")}
        </p>
      </div>
    </section>
  );
}

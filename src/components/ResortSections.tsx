import type { ResortInfoSection, ResortHighlightIcon } from "@/lib/resort-sections";
import {
  Anchor,
  CableCar,
  Castle,
  Coffee,
  Flame,
  Palette,
  Palmtree,
  Sparkles,
  Train,
  Waves,
} from "lucide-react";

type Props = {
  slug: string;
  sections: ResortInfoSection[];
};

const PIXIE_DVC_VALUE_ITEMS = [
  "Concierge reservation matching",
  "Seamless booking and planning",
  "Support for multi-room and split stays",
];
const GOOD_TO_KNOW_ITEMS = [
  "Best suited for longer, relaxed stays",
  "Focused on resort experience over park access",
  "Availability may vary by season",
];

const ICONS: Record<ResortHighlightIcon, typeof Sparkles> = {
  castle: Castle,
  train: Train,
  waves: Waves,
  cable: CableCar,
  sparkles: Sparkles,
  palmtree: Palmtree,
  anchor: Anchor,
  flame: Flame,
  coffee: Coffee,
  palette: Palette,
};

export default function ResortSections({ sections }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-6">
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="scroll-mt-32 border-t border-slate-200/60 py-10 first:border-t-0"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-[#0F2148]">
              {section.type === "transportation"
                ? "Getting Around"
                : section.type === "amenities"
                  ? "What You Get with PixieDVC"
                  : section.type === "policies"
                    ? "Good to Know"
                  : section.title}
            </h2>
          </div>

          {section.type === "overview" ? (
            <p className="max-w-3xl text-sm leading-6 text-[#0F2148]/75">
              {section.body}
            </p>
          ) : null}

          {section.type === "highlights" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => {
                const Icon = ICONS[item.icon] ?? Sparkles;
                return (
                  <div
                    key={item.label}
                    className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_12px_30px_rgba(15,33,72,0.08)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-[#0F2148]/10 p-2 text-[#0F2148]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <p className="text-sm font-semibold text-[#0F2148]">{item.label}</p>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#0F2148]/70">{item.note}</p>
                  </div>
                );
              })}
            </div>
          ) : null}

          {section.type === "transportation" ? (
            <ul className="space-y-3 text-sm text-[#0F2148]/80">
              {section.items.map((item) => (
                <li
                  key={item.title}
                  className="flex items-start gap-2"
                >
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0F2148]/50" />
                  <p>
                    <span className="font-semibold text-[#0F2148]">{item.title}:</span>{" "}
                    <span className="text-[#0F2148]/75">{item.note}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          {section.type === "dining" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-sm text-[#0F2148]/80"
                >
                  <p className="font-semibold text-[#0F2148]">{item.title}</p>
                  {item.note ? <p className="mt-2 text-xs text-[#0F2148]/70">{item.note}</p> : null}
                </div>
              ))}
            </div>
          ) : null}

          {section.type === "amenities" ? (
            <ul className="grid gap-3 text-sm text-[#0F2148]/80 sm:grid-cols-2 lg:grid-cols-3">
              {PIXIE_DVC_VALUE_ITEMS.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : null}

          {section.type === "policies" ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
              <ul className="space-y-3 text-sm text-[#0F2148]/80">
                {GOOD_TO_KNOW_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0F2148]/50" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {section.type === "points" ||
          section.type === "room_types" ||
          section.type === "map" ||
          section.type === "recreation" ? (
            <div className="rounded-3xl border border-dashed border-[#0F2148]/20 bg-white/70 p-6 text-sm text-[#0F2148]/70">
              <p className="font-semibold text-[#0F2148]">{section.title}</p>
              <p className="mt-2">{section.description}</p>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

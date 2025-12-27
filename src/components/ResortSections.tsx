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
            <h2 className="text-2xl font-semibold text-[#0F2148]">{section.title}</h2>
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-sm text-[#0F2148]/80"
                >
                  <p className="font-semibold text-[#0F2148]">{item.title}</p>
                  <p className="mt-2 text-xs text-[#0F2148]/70">{item.note}</p>
                </div>
              ))}
            </div>
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
              {section.items.map((item) => (
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
              <dl className="grid gap-4 text-sm text-[#0F2148]/75 sm:grid-cols-2">
                {section.items.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs uppercase tracking-[0.2em] text-[#0F2148]/50">{item.label}</dt>
                    <dd className="mt-1 text-sm text-[#0F2148]">{item.value}</dd>
                  </div>
                ))}
              </dl>
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

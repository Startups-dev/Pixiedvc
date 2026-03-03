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

const SECTION_IMAGE_BY_SLUG: Record<string, Partial<Record<string, { src: string; alt: string }>>> = {
  "bay-lake-tower": {
    "about this resort": {
      src: "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Bay%20Lake/BayLakeAbout.png",
      alt: "Bay Lake Tower overview",
    },
    dining: {
      src: "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Bay%20Lake/BayLakeDining.png",
      alt: "Bay Lake Tower dining options",
    },
    "good to know": {
      src: "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Bay%20Lake/BayLakeKnow.png",
      alt: "Bay Lake Tower good to know details",
    },
  },
};

function getSectionImage(slug: string, sectionHeading: string) {
  const imageMap = SECTION_IMAGE_BY_SLUG[slug];
  if (!imageMap) return null;
  return imageMap[sectionHeading.toLowerCase()] ?? null;
}

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

type DiningStructured = {
  tableService?: string[];
  quickService?: string[];
  lounges?: string[];
  grabAndGo?: string[];
  characterDining?: string[];
  notes?: string;
};

function normalizeDining(input: unknown): {
  notes?: string;
  tableService?: string[];
  quickService?: string[];
  lounges?: string[];
  grabAndGo?: string[];
  characterDining?: string[];
} | null {
  let value: unknown = input;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const maybeWrapped = value as { dining?: unknown };
  if (Object.prototype.hasOwnProperty.call(maybeWrapped, "dining")) {
    value = maybeWrapped.dining;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const toList = (entry: unknown): string[] => (Array.isArray(entry) ? entry.filter((item): item is string => typeof item === "string") : []);
  const notes = typeof raw.notes === "string" ? raw.notes : undefined;

  return {
    notes,
    tableService: toList(raw.tableService ?? raw.table_service),
    quickService: toList(raw.quickService ?? raw.quick_service),
    lounges: toList(raw.lounges),
    grabAndGo: toList(raw.grabAndGo ?? raw.grab_and_go),
    characterDining: toList(raw.characterDining ?? raw.character_dining),
  };
}

function renderDining(dining: unknown) {
  const normalizedDining = normalizeDining(dining);
  if (normalizedDining) {
    const groups: Array<{ label: string; items?: string[] }> = [
      { label: "Table Service", items: normalizedDining.tableService },
      { label: "Quick Service", items: normalizedDining.quickService },
      { label: "Lounges", items: normalizedDining.lounges },
      { label: "Grab & Go", items: normalizedDining.grabAndGo },
      { label: "Character Dining", items: normalizedDining.characterDining },
    ].filter((group) => Array.isArray(group.items) && group.items.length > 0);

    if (groups.length === 0 && !normalizedDining.notes?.trim()) {
      return <p className="text-sm text-[#0F2148]/60">Dining details coming soon.</p>;
    }

    return (
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="font-semibold text-[#0F2148]">{group.label}</p>
            <ul className="mt-2 space-y-2 text-sm text-[#0F2148]/80">
              {(group.items ?? []).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0F2148]/50" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {normalizedDining.notes?.trim() ? (
          <p className="mt-2 text-sm text-[#0F2148]/60">{normalizedDining.notes}</p>
        ) : null}
      </div>
    );
  }

  if (Array.isArray(dining) && dining.length > 0) {
    if (dining.every((item) => typeof item === "string")) {
      return (
        <ul className="space-y-3 text-sm text-[#0F2148]/80">
          {dining.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0F2148]/50" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }

    if (dining.every((item) => item && typeof item === "object" && "title" in item)) {
      const items = dining as Array<{ title: string; note?: string }>;
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-sm text-[#0F2148]/80"
            >
              <p className="font-semibold text-[#0F2148]">{item.title}</p>
              {item.note ? <p className="mt-2 text-xs text-[#0F2148]/70">{item.note}</p> : null}
            </div>
          ))}
        </div>
      );
    }
  }

  return <p className="text-sm text-[#0F2148]/60">Dining details coming soon.</p>;
}

export default function ResortSections({ sections }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-6">
      {sections.map((section) => {
        const sectionHeading =
          section.type === "overview"
            ? "About This Resort"
            : section.type === "transportation"
            ? "Getting Around"
            : section.type === "amenities"
              ? "What You Get with PixieDVC"
              : section.type === "policies"
                ? "Good to Know"
                : section.title;
        const useNavyHeadingBar =
          sectionHeading === "About This Resort" ||
          sectionHeading === "Good to Know" ||
          sectionHeading === "Dining" ||
          sectionHeading === "Getting Around";
        const sectionImage = getSectionImage(slug, sectionHeading);

        return (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-32 border-t border-slate-200/60 py-10 first:border-t-0"
          >
            <div className="mb-6 flex items-center justify-between">
              {useNavyHeadingBar ? (
                <div className="w-full rounded-xl bg-[#0F2148] px-5 py-2.5">
                  <h2 className="text-2xl font-semibold !text-white">{sectionHeading}</h2>
                </div>
              ) : (
                <h2 className="text-2xl font-semibold text-[#0F2148]">{sectionHeading}</h2>
              )}
            </div>
            {sectionImage ? (
              <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70">
                <img
                  src={sectionImage.src}
                  alt={sectionImage.alt}
                  className="h-auto w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}

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
            renderDining(section.items)
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
        );
      })}
    </div>
  );
}

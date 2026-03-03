import Image from "next/image";
import Link from "next/link";

import { getResortSummaries } from "@/lib/resorts";
import { getHighlightsForResort } from "@/lib/resort-sections";
import ResortChip from "@/components/resort/ResortChip";

export const revalidate = 1800;

type ResortGroupKey = "florida" | "california" | "other";

const LOCATION_GROUP_BY_SLUG: Record<string, ResortGroupKey> = {
  // Walt Disney World, Florida
  "animal-kingdom-villas": "florida",
  "animal-kingdom-lodge": "florida",
  "animal-kingdom-kidani": "florida",
  "bay-lake-tower": "florida",
  "beach-club-villas": "florida",
  "boardwalk-villas": "florida",
  "boulder-ridge-villas": "florida",
  "copper-creek-villas": "florida",
  "copper-creek-villas-and-cabins": "florida",
  "fort-wilderness-cabins": "florida",
  "grand-floridian": "florida",
  "grand-floridian-villas": "florida",
  "old-key-west": "florida",
  "polynesian-villas-and-bungalows": "florida",
  "polynesian-villas": "florida",
  "riviera": "florida",
  "riviera-resort": "florida",
  "saratoga-springs": "florida",
  "saratoga-springs-resort": "florida",

  // Disneyland Resort, California
  "disneyland-hotel": "california",
  "disneyland-hotel-villas": "california",
  "villas-at-disneyland-hotel": "california",
  "grand-californian": "california",
  "grand-californian-villas": "california",

  // Beach & Island Resorts
  aulani: "other",
  "hilton-head": "other",
  "hilton-head-island": "other",
  "vero-beach": "other",
};

const GROUP_META: Record<ResortGroupKey, { title: string; subtitle: string }> = {
  florida: {
    title: "Walt Disney World, Florida",
    subtitle: "Deluxe villas near the parks",
  },
  california: {
    title: "Disneyland Resort, California",
    subtitle: "Walkable access to Disneyland and DCA",
  },
  other: {
    title: "Beach & Island Resorts",
    subtitle: "Coastal and destination stays",
  },
};

function getGroupForSlug(slug: string): ResortGroupKey {
  return LOCATION_GROUP_BY_SLUG[slug] ?? "other";
}

export default async function ResortsIndexPage() {
  const resorts = await getResortSummaries();
  const groupedResorts: Record<ResortGroupKey, typeof resorts> = {
    florida: [],
    california: [],
    other: [],
  };

  for (const resort of resorts) {
    groupedResorts[getGroupForSlug(resort.slug)].push(resort);
  }

  for (const groupKey of Object.keys(groupedResorts) as ResortGroupKey[]) {
    groupedResorts[groupKey].sort((a, b) => a.name.localeCompare(b.name));
  }

  const groupOrder: ResortGroupKey[] = ["florida", "california", "other"];

  return (
    <main className="bg-white text-[#0F2148]">
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#0F2148]/50">PixieDVC Resorts</p>
            <h1 className="mt-2 text-3xl font-serif sm:text-4xl">Choose your next storybook stay</h1>
            <p className="mt-3 max-w-2xl text-sm text-[#0F2148]/70">
              Browse every resort in the PixieDVC collection with concierge notes, map highlights, and availability
              cues linked directly to each detail page.
            </p>
          </div>
        </div>

        {resorts.length ? (
          <div className="mt-12 space-y-14">
            {groupOrder.map((groupKey) => {
              const group = groupedResorts[groupKey];
              if (!group.length) return null;

              return (
                <section key={groupKey} className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-serif text-[#0F2148]">{GROUP_META[groupKey].title}</h2>
                    <p className="mt-1 text-sm text-[#0F2148]/65">{GROUP_META[groupKey].subtitle}</p>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {group.map((resort) => {
                      const image = resort.cardImage ?? "/images/castle-hero.png";
                      const isRelative = image.startsWith("/");
                      const highlightChips = getHighlightsForResort({
                        slug: resort.slug,
                        location: resort.location,
                        chips: resort.tags,
                      });
                      return (
                        <Link
                          key={resort.slug}
                          href={`/resorts/${resort.slug}`}
                          className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#0F2148]/10 bg-white/80 shadow-[0_24px_60px_rgba(15,23,42,0.12)] transition hover:-translate-y-1 hover:shadow-[0_32px_80px_rgba(15,23,42,0.18)]"
                        >
                          <div className="relative h-48 w-full overflow-hidden">
                            {isRelative ? (
                              <Image
                                src={image}
                                alt={`${resort.name} hero`}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                              />
                            ) : (
                              <div
                                aria-label={`${resort.name} hero`}
                                className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
                                style={{
                                  backgroundImage: `url(${image})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }}
                              />
                            )}
                          </div>
                          <div className="flex flex-1 flex-col gap-3 p-6">
                            <div className="space-y-1">
                              <p className="text-xs uppercase tracking-[0.2em] text-[#0F2148]/60">
                                {resort.location ?? "Disney Destinations"}
                              </p>
                              <h3 className="text-xl font-serif text-[#0F2148]">{resort.name}</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {highlightChips.map((tag) => (
                                <ResortChip key={tag} label={tag} variant="dark" />
                              ))}
                            </div>
                            {resort.pointsRange ? (
                              <span className="mt-auto inline-flex w-fit rounded-full bg-[#d9a64f]/15 px-3 py-1 text-xs font-semibold text-[#a07226]">
                                {resort.pointsRange}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="mt-14 rounded-3xl border border-dashed border-[#0F2148]/20 bg-white/70 p-10 text-sm text-[#0F2148]/60">
            Resort catalog is being enchanted. Check back soon for the full list.
          </div>
        )}
      </section>
    </main>
  );
}

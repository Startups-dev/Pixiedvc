import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import QuickFacts from "@/components/resort/QuickFacts";
import ResortEssentials from "@/components/resort/ResortEssentials";
import StickyCTA from "@/components/resort/StickyCTA";
import ResortCarouselClient from "@/components/ResortCarouselClient";
import ResortAvailabilityCta from "@/components/ResortAvailabilityCta";
import ResortSectionNav from "@/components/ResortSectionNav";
import ResortSections from "@/components/ResortSections";
import ResortHero from "@/components/resort/ResortHero";
import ResortChip from "@/components/resort/ResortChip";
import ResortRoomLayouts from "@/components/resorts/ResortRoomLayouts";
import ResortHighlightsSection from "@/components/resorts/ResortHighlightsSection";
import ContextualGuides from "@/components/guides/ContextualGuides";
import { getAllResortSlugs, getResortBySlug, getResortPhotos } from "@/lib/resorts";
import { getHighlightsForResort, getResortSections } from "@/lib/resort-sections";
import { resolveCalculatorCode } from "@/lib/resort-calculator";
import { resortHighlights } from "@/content/resortHighlights";

import type { Resort } from "@/lib/resorts";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

type Props = {
  params: {
    slug: string;
  };
  searchParams?: {
    from?: string;
    selected?: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resort = await getResortBySlug(slug);

  if (!resort) {
    return {};
  }

  return {
    title: `${resort.name} – PixieDVC`,
    description: resort.tagline,
    openGraph: {
      title: `${resort.name} – PixieDVC`,
      description: resort.tagline,
      images: resort.heroImage ? [{ url: resort.heroImage }] : undefined,
    },
  };
}

// export async function generateStaticParams() {
//   if (process.env.NODE_ENV === "development") {
//     return [];
//   }
//   const slugs = await getAllResortSlugs();
//   return slugs.map((slug) => ({ slug }));
// }

export default async function ResortPage({ params }: Props) {
  const { slug } = await params;
  const resort = await getResortBySlug(slug);

  if (!resort) {
    notFound();
  }

  const photos = await getResortPhotos(slug);
  const sections = getResortSections(slug);
  const resortData = resort;
  const resortCode = resolveCalculatorCode({ slug: resortData.slug });
  const highlightChips = getHighlightsForResort({
    slug,
    location: resortData.location,
    chips: resortData.chips,
    sections,
  });
  const highlight = resortHighlights[slug];

  return (
    <main className="bg-white text-[#0F2148]">
      <section className="mx-auto max-w-6xl px-6 pb-4 pt-6 font-sans">
        <div className="space-y-2">
          <Link
            href="/plan/resorts"
            className="text-sm font-medium text-[#0F2148]/70 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2148]/30"
          >
            ← Back to resort selection
          </Link>
          <div className="text-xs text-[#0F2148]/60">
            <Link href="/plan" className="hover:underline">
              Plan your stay
            </Link>
            <span className="px-2">→</span>
            <Link href="/plan/resorts" className="hover:underline">
              Resorts
            </Link>
            <span className="px-2">→</span>
            <span className="text-[#0F2148]/80">{resortData.name}</span>
          </div>
        </div>
      </section>
      {photos.length > 0 ? (
        <ResortCarouselClient photos={photos} />
      ) : (
        <ResortHero
          name={resortData.name}
          tagline={resortData.tagline}
          heroImage={photos[0]?.src ?? resortData.heroImage}
          chips={highlightChips}
        />
      )}
      {photos.length > 0 ? (
        <ResortIntro
          name={resortData.name}
          tagline={resortData.tagline}
          chips={highlightChips}
        />
      ) : null}

      {highlight ? (
        <section className="mx-auto max-w-6xl px-6">
          <ResortHighlightsSection highlight={highlight} resortName={resortData.name} />
        </section>
      ) : null}

      <ResortRoomLayouts resortCode={resortCode} />

      <QuickFacts id="availability" facts={resortData.facts} />
      <ResortAvailabilityCta slug={resortData.slug} name={resortData.name} />

      <ResortSectionNav sections={sections} />
      <ResortSections slug={slug} sections={sections} />

      <ResortEssentials id="essentials" essentials={resortData.essentials} />

      <MapSection resort={resortData} />
      <CompareSection currentResort={resortData} />
      <section className="mx-auto max-w-6xl px-6">
        <ContextualGuides
          title="Helpful Guides"
          description="Quick reads to help you plan around this resort."
          tags={[slug, "resorts"]}
          limit={3}
        />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-8 font-sans">
        <Link
          href="/plan/resorts"
          className="inline-flex items-center text-sm font-medium text-[#0F2148]/70 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2148]/30"
        >
          Still deciding? ← Back to resort selection
        </Link>
      </section>

      <StickyCTA resortName={resortData.name} resortSlug={resortData.slug} />
    </main>
  );
}

function ResortIntro({ name, tagline, chips }: { name: string; tagline: string; chips: string[] }) {
  return (
    <section className="bg-[#0F2148] pb-4 text-white">
      <div className="mx-auto max-w-6xl px-6 pb-10">
        <h1 className="mb-2 text-4xl font-serif md:text-5xl">{name}</h1>
        <p className="mb-5 max-w-2xl text-base text-white/85 md:text-lg">{tagline}</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <ResortChip key={chip} label={chip} variant="light" />
          ))}
        </div>
        <div className="mt-3 text-xs text-white/70">
          ★★★★☆ 4.8 <span className="ml-2 text-white/60">Guest favorite</span>
        </div>
      </div>
    </section>
  );
}


function MapSection({ resort }: { resort: Resort }) {
  const mapData = resort.map;
  const mapImage = mapData?.image ?? null;

  return (
    <section
      id="map"
      className="mx-auto max-w-6xl px-6 py-14"
    >
      <div className="grid gap-6 rounded-3xl border border-[#0F2148]/10 bg-white/80 p-8 shadow-[0_20px_60px_rgba(12,15,44,0.15)] md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-[#0F2148]/60">Resort Map</p>
          <h2 className="text-2xl font-serif">{mapData?.headline ?? `${resort.name} at-a-glance`}</h2>
          <p className="text-sm text-[#0F2148]/75">
            {mapData?.description ??
              `See how ${resort.name} connects to transportation, walking paths, and neighboring resorts. An interactive map will ship once our Supabase content pipeline is live.`}
          </p>
        </div>
        <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#0F2148]/25 bg-white/60 p-8 text-sm text-[#0F2148]/50">
          {mapImage ? (
            <div
              aria-label={`${resort.name} resort map`}
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${mapImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ) : null}
          {!mapImage ? <span>Interactive map coming soon</span> : null}
        </div>
      </div>
    </section>
  );
}

function CompareSection({ currentResort }: { currentResort: Resort }) {
  const nearby = currentResort.nearby ?? [];

  return (
    <section id="compare" className="mx-auto max-w-6xl px-6 pb-20">
      <div className="space-y-6 rounded-3xl border border-[#0F2148]/10 bg-white/80 p-8 shadow-[0_20px_60px_rgba(12,15,44,0.15)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#0F2148]/60">Compare Nearby</p>
            <h2 className="text-2xl font-serif">More stays near {currentResort.name}</h2>
          </div>
          <Link
            href="/resorts"
            className="inline-flex items-center gap-2 rounded-full border border-[#0F2148]/20 px-5 py-2 text-sm font-semibold text-[#0F2148] transition hover:border-[#0F2148]/40"
          >
            View all resorts →
          </Link>
        </div>
        {nearby.length ? (
          <ul className="grid gap-3 text-sm text-[#0F2148]/80 md:grid-cols-2">
            {nearby.map((resort) => (
              <li key={resort.slug} className="rounded-2xl border border-[#0F2148]/10 bg-white/80 p-4">
                <Link
                  href={`/resorts/${resort.slug}#availability`}
                  className="flex flex-col gap-1 text-left transition hover:text-[#2b3a70]"
                >
                  <span className="font-semibold text-[#0F2148]">{resort.name}</span>
                  {resort.tagline ? (
                    <span className="text-xs text-[#0F2148]/70">{resort.tagline}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#0F2148]/70">
            Concierge curates comparisons for {currentResort.name} with other PixieDVC favorites. Tap chat inside the
            dashboard to receive a personalized breakdown.
          </p>
        )}
      </div>
    </section>
  );
}

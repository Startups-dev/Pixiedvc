import type { Metadata } from "next";
import Link from "next/link";
import ReferralLink from "@/components/referral/ReferralLink";

import { Button, Card, SectionHeader } from "@pixiedvc/design-system";
import CategoryChips from "@/components/guides/CategoryChips";
import GuideGrid from "@/components/guides/GuideGrid";
import { getAllGuides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "PixieDVC Guides",
  description: "Short, practical guides to help you plan, price, and enjoy your DVC stay.",
  alternates: {
    canonical: "/guides",
  },
};

const FEATURED_GUIDE_SLUGS = [
  "animal-kingdom-value-studio-concierge-story",
  "what-is-dvc",
  "dvc-points-calculator-how-to-use",
];

const GUIDE_CATEGORIES = [
  "DVC Basics & Foundations",
  "How DVC Rentals Work (Process & Flow)",
  "Safety, Trust & Risk Management",
  "Pricing, Savings & Value",
  "Booking Timing & Availability Strategy",
  "Resorts Overview & Selection",
  "Room Types, Layouts & Party Size",
  "Planning Your Stay with a DVC Rental",
  "Comparisons & Alternatives",
  "Owner & Platform Insight (Behind the Scenes)",
];

export default async function GuidesPage() {
  const guides = await getAllGuides();
  const featured = FEATURED_GUIDE_SLUGS
    .map((slug) => guides.find((guide) => guide.slug === slug))
    .filter((guide): guide is NonNullable<typeof guide> => Boolean(guide));
  const featuredSlugs = new Set(featured.map((guide) => guide.slug));
  const latest = guides.filter((guide) => !featuredSlugs.has(guide.slug)).slice(0, 9);
  const guideCategories = new Set(guides.map((guide) => guide.category));
  const categories = [
    ...GUIDE_CATEGORIES,
    ...Array.from(guideCategories).filter((category) => !GUIDE_CATEGORIES.includes(category)),
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Guides"
          title="PixieDVC Guides"
          description="Clear, practical reads for planning your DVC stay with confidence."
        />
        <CategoryChips categories={categories} />
      </section>

      <section className="mt-12">
        <SectionHeader
          eyebrow="Featured"
          title="Start with these guides"
          description="The most helpful reads for new and returning guests."
        />
        <div className="mt-8">
          <GuideGrid guides={featured} />
        </div>
      </section>

      <section className="mt-16">
        <SectionHeader
          eyebrow="Latest"
          title="Newest guides"
          description="Short reads you can finish before your next planning session."
        />
        <div className="mt-8">
          <GuideGrid guides={latest} />
        </div>
      </section>

      <section className="mt-16">
        <Card className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Ready to plan?</p>
            <h2 className="font-display text-2xl text-ink">Try the DVC calculator</h2>
            <p className="text-sm text-muted">
              Estimate points and pricing in minutes, then book when you are ready.
            </p>
          </div>
          <Button asChild>
            <ReferralLink href="/calculator">Check Pricing</ReferralLink>
          </Button>
        </Card>
      </section>
    </div>
  );
}

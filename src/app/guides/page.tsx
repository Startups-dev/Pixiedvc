import type { Metadata } from "next";
import Link from "next/link";
import ReferralLink from "@/components/referral/ReferralLink";

import { Button, Card, SectionHeader } from "@pixiedvc/design-system";
import GuideGrid from "@/components/guides/GuideGrid";
import GuideNavDropdowns from "@/components/guides/GuideNavDropdowns";
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

export default async function GuidesPage() {
  const guides = await getAllGuides();
  const featured = FEATURED_GUIDE_SLUGS
    .map((slug) => guides.find((guide) => guide.slug === slug))
    .filter((guide): guide is NonNullable<typeof guide> => Boolean(guide));
  const featuredSlugs = new Set(featured.map((guide) => guide.slug));
  const latest = guides.filter((guide) => !featuredSlugs.has(guide.slug)).slice(0, 9);
  const guideBySlug = new Map(guides.map((guide) => [guide.slug, guide]));
  const buildSection = (title: string, slugs: string[]) => ({
    title,
    guides: slugs
      .map((slug) => guideBySlug.get(slug))
      .filter((guide): guide is NonNullable<typeof guide> => Boolean(guide))
      .map((guide) => ({ title: guide.title, href: `/guides/${guide.slug}` })),
  });
  const guideSections = [
    buildSection("DVC Basics & Foundations", [
      "what-is-dvc",
      "what-is-disney-vacation-club-and-how-does-it-work",
      "what-is-a-disney-vacation-club-rental",
      "renting-vs-owning",
      "renting-dvc-points-vs-buying-disney-vacation-club",
    ]),
    buildSection("Pricing, Savings & Value", [
      "dvc-points-calculator-how-to-use",
      "how-much-can-you-save-by-renting-disney-vacation-club-points",
      "dvc-rental-pricing-vs-booking-disney-hotels-directly",
      "how-dvc-point-charts-affect-your-stay",
      "point-charts-explained",
      "how-to-estimate-the-total-cost-of-a-dvc-rental",
    ]),
    buildSection("Planning Your Stay", [
      "check-in-tips-for-dvc-guests",
      "groceries-for-your-dvc-stay",
      "how-to-link-your-dvc-rental-to-my-disney-experience",
      "what-to-expect-after-you-book-a-dvc-rental",
      "what-dvc-renters-can-and-cannot-do-during-their-stay",
      "which-disney-vacation-club-resorts-are-best-for-families",
    ]),
    buildSection("High-Demand & Premium Access", [
      "animal-kingdom-value-studio-concierge-story",
      "how-far-in-advance-should-you-rent-dvc-points",
      "booking-dvc-rentals-for-peak-and-off-peak-travel",
      "the-best-time-of-year-to-rent-dvc-points",
      "studios-vs-one-bedroom-villas-which-dvc-room-is-right-for-you",
      "choosing-the-right-dvc-room-for-larger-or-multi-generational-families",
    ]),
    buildSection("Trust & How PixieDVC Works", [
      "how-disney-vacation-club-rentals-work-step-by-step",
      "how-renting-dvc-points-works",
      "how-long-the-dvc-rental-process-takes",
      "how-availability-works-when-renting-dvc-points",
      "how-dvc-owner-verification-works-and-why-it-matters",
      "how-dvc-rental-agreements-protect-guests-and-owners",
      "is-renting-dvc-points-safe",
      "is-renting-disney-vacation-club-points-safe",
      "is-renting-dvc-points-safe-for-international-travelers",
      "what-happens-if-a-dvc-owner-cancels-a-reservation",
      "can-you-modify-or-cancel-a-dvc-rental",
      "what-documents-you-should-keep-for-a-dvc-rental",
      "trust",
    ]),
  ].filter((section) => section.guides.length > 0);

  return (
    <div className="bg-[#F7F5F2] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <section className="space-y-6">
          <SectionHeader
            eyebrow="Guides"
            title="PixieDVC Guides"
            description="Clear, practical reads for planning your DVC stay with confidence."
          />
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

        <section className="mt-12">
          <GuideNavDropdowns sections={guideSections} />
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
          <Card className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:flex-row md:items-center">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">Ready to plan?</p>
              <h2 className="font-display text-2xl text-ink">Try the DVC calculator</h2>
              <p className="text-sm text-muted">
                Estimate points and pricing in minutes, then book when you are ready.
              </p>
            </div>
            <Button asChild>
              <ReferralLink href="/calculator" className="!text-white">
                Check Pricing
              </ReferralLink>
            </Button>
          </Card>
        </section>
      </div>
    </div>
  );
}

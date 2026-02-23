import type { Metadata } from "next";
import Link from "next/link";
import ReferralLink from "@/components/referral/ReferralLink";

import { Button, Card, SectionHeader } from "@pixiedvc/design-system";
import GuideGrid from "@/components/guides/GuideGrid";
import GuideNavDropdowns from "@/components/guides/GuideNavDropdowns";
import { getAllGuides, type GuideMeta } from "@/lib/guides";

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

const READY_STAY_GUIDE_LINKS = [
  { title: "What Is a Ready Stay?", href: "/guides/ready-stays-transfer-linking#what-is-ready-stay" },
  { title: "How the Ready Stay Process Works", href: "/guides/ready-stays-transfer-linking#how-ready-stay-works" },
  { title: "When Can I Link My Reservation?", href: "/guides/ready-stays-transfer-linking#when-can-i-link" },
  { title: "How to Link Your Reservation", href: "/guides/ready-stays-transfer-linking#how-to-link" },
  { title: "Transfer in Progress, What That Means", href: "/guides/ready-stays-transfer-linking#transfer-in-progress" },
];

const READY_STAY_NEWEST_GUIDES: GuideMeta[] = [
  {
    id: "ready-stays-guide-1",
    title: "What Is a Ready Stay?",
    slug: "ready-stays-transfer-linking#what-is-ready-stay",
    excerpt: "Understand what makes Ready Stays different from traditional DVC booking and why they are already secured.",
    category: "Trust & How PixieDVC Works",
    tags: ["ready stays", "transfer"],
    heroImage: null,
    readingTime: 3,
    publishedAt: "2026-02-19T00:00:00.000Z",
    viewCount: 0,
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    ogImageUrl: null,
  },
  {
    id: "ready-stays-guide-2",
    title: "How the Ready Stay Process Works",
    slug: "ready-stays-transfer-linking#how-ready-stay-works",
    excerpt: "A step-by-step flow from selecting a stay to payment, owner transfer, and confirmation readiness.",
    category: "Trust & How PixieDVC Works",
    tags: ["ready stays", "process"],
    heroImage: null,
    readingTime: 4,
    publishedAt: "2026-02-18T00:00:00.000Z",
    viewCount: 0,
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    ogImageUrl: null,
  },
  {
    id: "ready-stays-guide-3",
    title: "When Can I Link My Reservation?",
    slug: "ready-stays-transfer-linking#when-can-i-link",
    excerpt: "See what Pending means, when the confirmation becomes active, and expected transfer timing.",
    category: "Trust & How PixieDVC Works",
    tags: ["ready stays", "my disney experience", "transfer"],
    heroImage: null,
    readingTime: 3,
    publishedAt: "2026-02-17T00:00:00.000Z",
    viewCount: 0,
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    ogImageUrl: null,
  },
  {
    id: "ready-stays-guide-4",
    title: "How to Link Your Reservation",
    slug: "ready-stays-transfer-linking#how-to-link",
    excerpt: "Follow the exact My Disney Experience steps to link your reservation once it is ready.",
    category: "Trust & How PixieDVC Works",
    tags: ["ready stays", "my disney experience", "linking"],
    heroImage: null,
    readingTime: 3,
    publishedAt: "2026-02-16T00:00:00.000Z",
    viewCount: 0,
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    ogImageUrl: null,
  },
  {
    id: "ready-stays-guide-5",
    title: "Transfer in Progress, What That Means",
    slug: "ready-stays-transfer-linking#transfer-in-progress",
    excerpt: "What the transfer stage means, what is happening behind the scenes, and when to follow up.",
    category: "Trust & How PixieDVC Works",
    tags: ["ready stays", "transfer in progress"],
    heroImage: null,
    readingTime: 3,
    publishedAt: "2026-02-15T00:00:00.000Z",
    viewCount: 0,
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    ogImageUrl: null,
  },
];

export default async function GuidesPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const guides = await getAllGuides();
  const query = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const normalizedQuery = query.toLowerCase();
  const filteredGuides = normalizedQuery
    ? guides.filter((guide) => {
        const haystack = [
          guide.title,
          guide.excerpt,
          guide.category,
          ...(guide.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : guides;
  const featured = FEATURED_GUIDE_SLUGS
    .map((slug) => filteredGuides.find((guide) => guide.slug === slug))
    .filter((guide): guide is NonNullable<typeof guide> => Boolean(guide));
  const featuredSlugs = new Set(featured.map((guide) => guide.slug));
  const filteredReadyStayNewest = normalizedQuery
    ? READY_STAY_NEWEST_GUIDES.filter((guide) => {
        const haystack = [guide.title, guide.excerpt, guide.category, ...(guide.tags ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : READY_STAY_NEWEST_GUIDES;
  const latest = [
    ...filteredReadyStayNewest,
    ...filteredGuides.filter((guide) => !featuredSlugs.has(guide.slug)),
  ].slice(0, 9);
  const guideBySlug = new Map(filteredGuides.map((guide) => [guide.slug, guide]));
  const buildSection = (title: string, slugs: string[]) => ({
    title,
    guides: slugs
      .map((slug) => guideBySlug.get(slug))
      .filter((guide): guide is NonNullable<typeof guide> => Boolean(guide))
      .map((guide) => ({ title: guide.title, href: `/guides/${guide.slug}` })),
  });
  const trustSection = buildSection("Trust & How PixieDVC Works", [
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
  ]);

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
    {
      ...trustSection,
      guides: [...trustSection.guides, ...READY_STAY_GUIDE_LINKS],
    },
  ].filter((section) => section.guides.length > 0);
  const hasResults = filteredGuides.length > 0 || filteredReadyStayNewest.length > 0;

  return (
    <div className="bg-[#F7F5F2] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <section className="space-y-6">
          <SectionHeader
            eyebrow="Guides"
            title="PixieDVC Guides"
            description="Clear, practical reads for planning your DVC stay with confidence."
          />
          <div className="max-w-xl">
            <form method="get" className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search guides"
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-ink placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
              />
              <Button type="submit" className="h-10 px-4">
                Search
              </Button>
              {query ? (
                <Link href="/guides" className="text-xs font-semibold text-muted hover:text-ink">
                  Clear
                </Link>
              ) : null}
            </form>
          </div>
        </section>

        {!hasResults ? (
          <section className="mt-12">
            <Card className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold text-ink">No guides found</p>
              <p className="mt-1 text-sm text-muted">
                Try a different keyword or clear search.
              </p>
            </Card>
          </section>
        ) : null}

        {featured.length > 0 ? (
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
        ) : null}

        {guideSections.length > 0 ? (
          <section className="mt-12">
            <GuideNavDropdowns sections={guideSections} />
          </section>
        ) : null}

        {latest.length > 0 ? (
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
        ) : null}

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

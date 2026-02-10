import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import GuideHeader from "@/components/guides/GuideHeader";
import GuideTOC from "@/components/guides/GuideTOC";
import GuideResources from "@/components/guides/GuideResources";
import RelatedGuidesList from "@/components/guides/RelatedGuidesList";
import { formatGuideDate, getGuideBySlug, getRelatedGuides } from "@/lib/guides";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) return {};

  const { title, excerpt, heroImage, metaTitle, metaDescription, ogImageUrl } = guide.guide;
  return {
    title: metaTitle ?? `${title} | PixieDVC Guides`,
    description: metaDescription ?? excerpt,
    alternates: {
      canonical: `/guides/${slug}`,
    },
    openGraph: {
      title: metaTitle ?? `${title} | PixieDVC Guides`,
      description: metaDescription ?? excerpt,
      images: (ogImageUrl ?? heroImage) ? [{ url: ogImageUrl ?? heroImage! }] : undefined,
    },
  };
}

export default async function GuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) {
    notFound();
  }

  const related = await getRelatedGuides(slug, 6);
  const { title, excerpt, category, publishedAt } = guide.guide;
  const updatedLabel = `Updated ${formatGuideDate(publishedAt)}`;
  const isOwnerGuide = (category ?? "").toLowerCase().includes("owner");
  const resources = isOwnerGuide
    ? [
        {
          title: "Sample Guest Invoice",
          description: "Example invoice template for owner-to-guest rentals.",
          href: "/info/owners/sample-guest-invoice",
          actionLabel: "Open",
        },
        {
          title: "Sample Intermediary Agreement",
          description: "Review the standard intermediary agreement format.",
          href: "/info/owners/sample-intermediary-agreement",
          actionLabel: "Open",
        },
      ]
    : [];

  return (
    <div className="bg-[#F7F5F2] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <GuideHeader title={title} subtitle={excerpt} category={category} updatedLabel={updatedLabel} />

        <div className="mt-12 grid gap-10 lg:grid-cols-12">
          <main className="space-y-8 lg:col-span-8">
            <Card className="rounded-2xl border border-ink/10 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">Owner Essentials</p>
              <h2 className="mt-3 font-display text-2xl text-ink">
                Step-by-step support from listing to payout
              </h2>
              <p className="mt-3 text-sm text-muted">{excerpt}</p>
            </Card>

            <GuideTOC items={guide.toc} />

            <article className="space-y-8">{guide.content}</article>
          </main>

          <aside className="space-y-6 lg:col-span-4">
            <GuideResources items={resources} />
            <RelatedGuidesList guides={related} />
          </aside>
        </div>
      </div>
    </div>
  );
}

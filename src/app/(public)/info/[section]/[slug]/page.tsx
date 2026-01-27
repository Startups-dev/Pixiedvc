import { notFound } from "next/navigation";

import { InfoLayout } from "@/components/info-layout";
import OwnerInformationDashboard from "@/components/owners/OwnerInformationDashboard";
import { loadMdx, loadMdxDirectory, loadMdxSource } from "@/lib/mdx";
import { getContextualGuides } from "@/lib/guides";

interface Params {
  section: string;
  slug: string;
}

export async function generateStaticParams() {
  const sections = ["owners", "guests", "info"];
  const params: { section: string; slug: string }[] = [];

  for (const section of sections) {
    const directory = await loadMdxDirectory(section).catch(() => [] as never);
    for (const entry of directory) {
      params.push({ section, slug: entry.slug });
    }
  }

  return params;
}

export default async function InfoPage({ params }: { params: Params }) {
  const { section, slug } = params;
  let entries;
  try {
    entries = await loadMdxDirectory(section);
  } catch (err) {
    console.error(err);
    notFound();
  }

  const current = entries.find((entry) => entry.slug === slug);
  if (!current) {
    notFound();
  }

  if (section === "owners" && slug === "information") {
    return <OwnerInformationDashboard />;
  }

  const { content, meta } = await loadMdx([section, slug]);
  const source = await loadMdxSource([section, slug]);

  const sectionLabel = section.charAt(0).toUpperCase() + section.slice(1);
  const updatedLabel = meta.updated ? `Updated ${meta.updated}` : undefined;

  const toc = buildToc(source);

  const resourceSlugs = ["sample-guest-invoice", "sample-intermediary-agreement"];
  const resources =
    section === "owners"
      ? resourceSlugs
          .map((resourceSlug) => entries.find((entry) => entry.slug === resourceSlug))
          .filter(Boolean)
          .map((entry) => ({
            title: entry!.meta.title,
            description: entry!.meta.summary ?? "Owner resource",
            href: `/info/${section}/${entry!.slug}`,
            actionLabel: "Open",
          }))
      : [];

  const relatedGuideRows = await getContextualGuides({
    tags: [section],
    category: sectionLabel,
    limit: 4,
  });
  const relatedGuides = relatedGuideRows.map((guide) => ({
    title: guide.title,
    description: guide.excerpt,
    href: `/guides/${guide.slug}`,
  }));

  const callout =
    section === "owners"
      ? {
          label: "Owner Essentials",
          title: "Step-by-step support from listing to payout",
          body: meta.summary,
        }
      : undefined;

  return (
    <div className="min-h-screen bg-surface text-ink">
      <InfoLayout
        hero={{
          title: meta.title,
          summary: meta.summary,
          updated: updatedLabel,
          category: sectionLabel,
        }}
        toc={toc}
        callout={callout}
        resources={resources}
        relatedGuides={relatedGuides}
        sidebar={entries.map((entry) => ({
          title: entry.meta.title,
          summary: entry.meta.summary,
          updated: entry.meta.updated,
          href: `/info/${section}/${entry.slug}`,
          active: entry.slug === slug,
        }))}
      >
        {content}
      </InfoLayout>
    </div>
  );
}

function buildToc(source: string) {
  const toc: Array<{ id: string; title: string; level: 2 | 3 }> = [];
  const lines = source.split("\n");
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/);
    if (h2?.[1]) {
      const title = h2[1].trim();
      toc.push({ id: slugify(title), title, level: 2 });
      continue;
    }
    const h3 = line.match(/^###\s+(.+)/);
    if (h3?.[1]) {
      const title = h3[1].trim();
      toc.push({ id: slugify(title), title, level: 3 });
    }
  }
  return toc;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

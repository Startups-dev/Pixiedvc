import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { InfoLayout } from "@/components/info-layout";
import { loadMdx, loadMdxDirectory } from "@/lib/mdx";

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

  const { content, meta } = await loadMdx([section, slug]);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <SiteHeader variant="solid" />
      <InfoLayout
        hero={{
          title: meta.title,
          summary: meta.summary,
        }}
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

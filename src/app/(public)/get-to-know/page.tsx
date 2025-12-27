import Link from "next/link";

import { Card, SectionHeader } from "@pixiedvc/design-system";
import { SiteHeader } from "@/components/site-header";
import { loadMdxDirectory } from "@/lib/mdx";

const sections = [
  {
    id: "guests",
    title: "Guest Guides",
    description: "Rental process, cancellation policies, and check-in tips.",
  },
  {
    id: "owners",
    title: "Owner Resources",
    description: "Agreements, sample invoices, and operational best practices.",
  },
  {
    id: "info",
    title: "PixieDVC Knowledge Base",
    description: "Frequently asked questions and platform-wide notices.",
  },
];

export default async function GetToKnowPage() {
  const directories = await Promise.all(
    sections.map(async (section) => ({
      section: section.id,
      entries: await loadMdxDirectory(section.id),
    })),
  );

  return (
    <div className="min-h-screen bg-surface text-ink">
      <SiteHeader variant="solid" />
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <div className="absolute left-[25%] top-[-10%] h-[360px] w-[360px] rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute right-[-15%] top-[30%] h-[320px] w-[320px] rounded-full bg-lavender/40 blur-3xl" />
        </div>
        <main className="relative z-10 mx-auto max-w-6xl px-6 py-20 space-y-16">
          <SectionHeader
            eyebrow="Knowledge Hub"
            title="Get to know the PixieDVC platform"
            description="Dive into guides curated for guests, owners, and partners. Every article stays up to date via MDX so our concierge team can edit without code."
          />

          <div className="grid gap-12 lg:grid-cols-3">
            {sections.map((section) => {
              const directory = directories.find((entry) => entry.section === section.id);
              return (
                <Card key={section.id} className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">{section.title}</p>
                    <h3 className="font-display text-2xl text-ink">{section.description}</h3>
                  </div>
                  <div className="space-y-3">
                    {directory?.entries.slice(0, 3).map((item) => (
                      <Link
                        key={item.slug}
                        href={`/info/${section.id}/${item.slug}`}
                        className="block rounded-2xl border border-ink/10 bg-white/80 p-4 text-sm text-ink transition hover:border-brand hover:text-brand"
                      >
                        <p className="font-semibold">{item.meta.title}</p>
                        <p className="text-xs text-muted">{item.meta.summary}</p>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={directory?.entries[0] ? `/info/${section.id}/${directory.entries[0].slug}` : "#" }
                    className="mt-auto text-sm font-semibold text-brand underline-offset-4 hover:underline"
                  >
                    View all {section.title.toLowerCase()}
                  </Link>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

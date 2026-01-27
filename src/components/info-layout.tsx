import Link from "next/link";

import { Button, Card } from "@pixiedvc/design-system";

export type InfoSidebarItem = {
  title: string;
  summary?: string;
  updated?: string;
  href: string;
  active?: boolean;
};

type InfoLayoutProps = {
  hero: {
    title: string;
    summary?: string;
    updated?: string;
    category?: string;
  };
  sidebar: InfoSidebarItem[];
  toc?: { id: string; title: string; level: 2 | 3 }[];
  callout?: {
    label: string;
    title: string;
    body?: string;
  };
  resources?: Array<{
    title: string;
    description: string;
    href: string;
    actionLabel: string;
  }>;
  relatedGuides?: Array<{
    title: string;
    description: string;
    href: string;
  }>;
  children: React.ReactNode;
};

export function InfoLayout({
  hero,
  sidebar,
  toc = [],
  callout,
  resources = [],
  relatedGuides = [],
  children,
}: InfoLayoutProps) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
          <div className="absolute left-[20%] top-[-5%] h-[320px] w-[320px] rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute right-[-10%] top-[15%] h-[280px] w-[280px] rounded-full bg-lavender/40 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-16">
          <header className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Knowledge Hub</p>
                <h1 className="font-display text-4xl text-ink sm:text-5xl">{hero.title}</h1>
                {hero.summary ? <p className="max-w-2xl text-lg text-muted">{hero.summary}</p> : null}
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted">
                  {hero.category ? (
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-brand">{hero.category}</span>
                  ) : null}
                  {hero.updated ? <span>{hero.updated}</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/contact?role=Owner">Contact Concierge</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/guides">Back to Guides</Link>
                </Button>
              </div>
            </div>
          </header>

          <div className="mt-12 grid gap-10 lg:grid-cols-12">
            <main className="space-y-8 lg:col-span-8">
              {callout ? (
                <Card className="border border-ink/10 bg-white/90">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">{callout.label}</p>
                  <h2 className="mt-3 font-display text-2xl text-ink">{callout.title}</h2>
                  {callout.body ? <p className="mt-3 text-sm text-muted">{callout.body}</p> : null}
                </Card>
              ) : null}

              {toc.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Table of contents</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {toc.map((item) => (
                      <li key={`${item.id}-${item.title}`} className={item.level === 3 ? "pl-3 text-slate-500" : ""}>
                        <Link href={`#${item.id}`} className="transition hover:text-brand">
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <article className="space-y-6 rounded-[32px] bg-white/90 p-8 shadow-[0_30px_70px_rgba(15,23,42,0.12)] backdrop-blur">
                {children}
              </article>
            </main>

            <aside className="space-y-6 lg:col-span-4">
              {resources.length > 0 ? (
                <Card className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">Resources</p>
                    <h3 className="mt-2 font-display text-xl text-ink">Owner-ready documents</h3>
                  </div>
                  <div className="space-y-3">
                    {resources.map((item) => (
                      <div
                        key={item.href}
                        className="rounded-2xl border border-slate-100 bg-white/80 p-4 text-sm text-slate-600"
                      >
                        <p className="font-semibold text-ink">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                        <Button asChild variant="ghost" className="mt-3 px-3 py-1 text-xs">
                          <Link href={item.href}>{item.actionLabel}</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              {relatedGuides.length > 0 ? (
                <Card className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">Related Guides</p>
                    <h3 className="mt-2 font-display text-xl text-ink">Keep exploring</h3>
                  </div>
                  <div className="space-y-4">
                    {relatedGuides.map((item) => (
                      <div key={item.href} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                        <Link href={item.href} className="mt-2 inline-flex text-xs font-semibold text-brand">
                          Read →
                        </Link>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

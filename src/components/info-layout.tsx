import Link from "next/link";

import { Card, SectionHeader } from "@pixiedvc/design-system";

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
  };
  sidebar: InfoSidebarItem[];
  children: React.ReactNode;
};

export function InfoLayout({ hero, sidebar, children }: InfoLayoutProps) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
          <div className="absolute left-[20%] top-[-5%] h-[320px] w-[320px] rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute right-[-10%] top-[15%] h-[280px] w-[280px] rounded-full bg-lavender/40 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-16">
          <SectionHeader eyebrow="Knowledge Hub" title={hero.title} description={hero.summary} />
          <div className="mt-16 grid gap-12 lg:grid-cols-[260px_1fr]">
            <aside className="space-y-4">
              {sidebar.map((item) => (
                <Card
                  key={item.href}
                  surface={item.active ? "navy" : "light"}
                  className={item.active ? "text-white" : undefined}
                >
                  <Link href={item.href} className="block space-y-2">
                    <p className={item.active ? "text-xs uppercase tracking-[0.2em] text-white/70" : "text-xs uppercase tracking-[0.2em] text-muted"}>
                      {item.updated ? `Updated ${item.updated}` : "Resource"}
                    </p>
                    <p className={item.active ? "font-display text-lg" : "font-display text-lg text-ink"}>
                      {item.title}
                    </p>
                    {item.summary ? (
                      <p className={item.active ? "text-sm text-white/80" : "text-sm text-muted"}>{item.summary}</p>
                    ) : null}
                  </Link>
                </Card>
              ))}
            </aside>
            <article className="space-y-6 rounded-[32px] bg-white/90 p-8 shadow-[0_30px_70px_rgba(15,23,42,0.12)] backdrop-blur">
              {children}
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

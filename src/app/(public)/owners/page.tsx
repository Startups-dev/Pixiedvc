import Link from "next/link";

import { Button, Card, SectionHeader } from "@pixiedvc/design-system";
import { SiteHeader } from "@/components/site-header";

const highlights = [
  {
    title: "Concierge Matching",
    description: "We only send guests who fit your use year, point totals, and resort preferences.",
  },
  {
    title: "Contract Automation",
    description: "PixieDVC drafts and tracks every intermediary agreement — you just review and sign.",
  },
  {
    title: "Transparent Payouts",
    description: "View upcoming deposits, bonuses, and historical statements in real time.",
  },
];

export default function OwnersPage() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <SiteHeader variant="solid" />
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <div className="absolute left-[45%] top-[-10%] h-[360px] w-[360px] rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute right-[-15%] top-[30%] h-[320px] w-[320px] rounded-full bg-lavender/40 blur-3xl" />
        </div>

        <main className="relative z-10 mx-auto max-w-6xl px-6 py-20">
          <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted shadow-sm backdrop-blur">
                Owner Experience
              </span>
              <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl lg:text-6xl">
                Turn unused points into delightfully hosted stays.
              </h1>
              <p className="max-w-xl text-lg text-muted">
                PixieDVC verifies guests, orchestrates contracts, and handles payouts so you can share the
                magic without the overhead.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/signup?role=owner">Join as an Owner</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/info/owners/information">Explore Owner Resources</Link>
                </Button>
              </div>
            </div>
            <Card surface="navy" className="space-y-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Matching Snapshot</p>
              <p className="font-display text-3xl">Bay Lake Tower | Theme Park View</p>
              <p className="text-sm text-white/80">
                Matched 18 points for April Sun-Thu stay. Guest deposit secured and contract delivered in under
                6 hours.
              </p>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-white/60">Avg. Match Time</p>
                  <p className="text-lg font-semibold text-white">3.4 days</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-white/60">Verified Guests</p>
                  <p className="text-lg font-semibold text-white">100%</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-white/60">Net Promoter</p>
                  <p className="text-lg font-semibold text-white">+74</p>
                </div>
              </div>
            </Card>
          </section>

          <section className="mt-24 space-y-12" id="highlights">
            <SectionHeader
              eyebrow="Why Owners Choose Us"
              title="Curated matching, concierge handling, transparent payouts"
              description="You designed the magic — we handle the operations so members and their guests enjoy flawless stays."
            />
            <div className="grid gap-6 sm:grid-cols-3">
              {highlights.map((item) => (
                <Card key={item.title}>
                  <h3 className="font-display text-xl text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted">{item.description}</p>
                </Card>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

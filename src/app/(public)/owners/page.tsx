import Link from "next/link";

import { Button, Card, SectionHeader } from "@pixiedvc/design-system";

const highlights = [
  {
    title: "Owner-First Matching",
    description:
      "We don’t broadcast your points to a public marketplace. Each match is curated and presented for your approval before any reservation or contract is created.",
  },
  {
    title: "Contract Automation",
    description: "PixieDVC drafts and tracks every intermediary agreement, you just review and sign.",
  },
  {
    title: "Transparent Payouts",
    description: "View upcoming deposits, bonuses, and historical statements in real time.",
  },
];

export default function OwnersPage() {
  return (
    <div className="min-h-screen bg-surface text-ink">
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
                Put your unused points to work.
              </h1>
              <p className="max-w-xl text-lg text-muted">
                PixieDVC takes care of guest verification, agreements, and payouts, so you can rent with
                confidence and without the hassle.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/signup?role=owner">Join as an Owner</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/info/owners/information">Explore Owner Resources</Link>
                </Button>
              </div>
              <p className="text-sm text-muted">
                No obligation. No exclusivity. You review and approve every match before anything is finalized.
              </p>
            </div>
            <Card surface="navy" className="space-y-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Matching Snapshot</p>
              <p className="font-display text-3xl">Bay Lake Tower | Theme Park View</p>
              <p className="text-sm text-white/80">
                Matched 112 points for an April 5–9 (Sun–Thu) stay. Owner match completed in 5 hours, with
                deposit secured and contract signed in under 6 hours.
              </p>
              <p className="text-xs text-white/70">Funds are secured before contracts are finalized.</p>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-white/60">Avg. Match Time</p>
                  <p className="text-lg font-semibold text-white">4–36 hours</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-white/60">Verified Guests</p>
                  <p className="text-lg font-semibold text-white">100%</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-white/60">Trust Signal</p>
                  <p className="text-sm text-white/80">Guests happily recommend PixieDVC</p>
                </div>
              </div>
            </Card>
          </section>

          <section className="mt-24 space-y-12" id="highlights">
            <SectionHeader
              eyebrow="Why Owners Choose Us"
              title="Curated matching, concierge handling, transparent payouts"
              description="You designed the magic, we handle the operations so members and their guests enjoy flawless stays."
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
          <p className="mt-10 text-sm text-muted">
            PixieDVC operates with owner-first safeguards, verified guests, and contract-backed payouts.
          </p>
        </main>
      </div>
    </div>
  );
}

import Link from "next/link";
import ReferralLink from "@/components/referral/ReferralLink";

import { Button, Card, SectionHeader } from "@pixiedvc/design-system";

const reasons = [
  {
    title: "Curated Matches",
    description: "We pair you with verified owners who can host your exact villa type and dates.",
  },
  {
    title: "Concierge Guidance",
    description: "Dedicated specialists monitor dining windows, Genie+ drops, and celebration moments.",
  },
  {
    title: "Refundable Deposits",
    description: "Your $105 deposit stays refundable until we deliver a confirmed reservation number.",
  },
];

export default function GuestsPage() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <div className="absolute left-[35%] top-[-12%] h-[360px] w-[360px] rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute right-[-20%] top-[40%] h-[320px] w-[320px] rounded-full bg-mint/25 blur-3xl" />
        </div>

        <main className="relative z-10 mx-auto max-w-6xl px-6 py-20">
          <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted shadow-sm backdrop-blur">
                Guest Experience
              </span>
              <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl lg:text-6xl">
                Book DVC villas with concierge magic & zero guesswork.
              </h1>
              <p className="max-w-xl text-lg text-muted">
                Tell us your dream stay and our planners will match you with a verified owner, craft your
                itinerary, and keep you updated every step of the way.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <ReferralLink href="/calculator">Launch the Trip Builder</ReferralLink>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/info/guests/rental-process">See How Rentals Work</Link>
                </Button>
              </div>
            </div>
            <Card surface="light" className="space-y-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Calculator Sneak Peek</p>
              <div className="rounded-3xl bg-white/70 p-5 shadow-inner">
                <p className="text-sm text-muted">Bay Lake Tower • Theme Park View</p>
                <p className="mt-2 text-2xl font-display text-ink">192 points · $2,950 est.</p>
                <p className="mt-3 text-sm text-muted">
                  Save 12% compared to cash rates and unlock monorail mornings plus extended evening hours.
                </p>
              </div>
              <Button asChild variant="secondary">
                <ReferralLink href="/plan">Start a Reservation</ReferralLink>
              </Button>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Deposits stay refundable until we match you.
              </p>
            </Card>
          </section>

          <section className="mt-24 space-y-12">
            <SectionHeader
              eyebrow="Why Guests Love PixieDVC"
              title="Disney storytelling, boutique travel polish"
              description="Every stay blends insider park tips with hospitality-level communication."
            />
            <div className="grid gap-6 sm:grid-cols-3">
              {reasons.map((item) => (
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

import { Suspense } from "react";
import Link from "next/link";
import ReferralLink from "@/components/referral/ReferralLink";

import { Button, Card, SectionHeader } from "@pixiedvc/design-system";
import EstimateShareControl from "@/components/guest/EstimateShareControl";

const reasons = [
  {
    title: "Curated Matches",
    description:
      "We pair you with verified owners who can host your exact villa type and dates. Your request is matched privately with owners whose points, use year, and resort preferences align with your dates.",
  },
  {
    title: "Concierge Guidance",
    description: "Dedicated specialists monitor dining windows, Genie+ drops, and celebration moments.",
  },
  {
    title: "Secure, Refundable Deposits",
    description: "Your $99 deposit stays refundable until we deliver a confirmed reservation number.",
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
                Tell us your travel dates and villa preferences. PixieDVC matches your request with verified Disney Vacation Club owners and manages the coordination, agreements, and confirmation, so your stay is secured clearly and professionally.
              </p>
              <div className="flex flex-wrap gap-3">
                <Suspense fallback={null}>
                  <Button asChild>
                    <ReferralLink href="/calculator">Launch Pixie Booking</ReferralLink>
                  </Button>
                </Suspense>
                <Button asChild variant="ghost">
                  <Link href="/info/guests/rental-process">See How Rentals Work</Link>
                </Button>
              </div>
              <div className="flex flex-col gap-2 text-sm text-muted sm:flex-row sm:flex-wrap">
                <span className="inline-flex items-center rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs text-ink/70">
                  No owner outreach required
                </span>
                <span className="inline-flex items-center rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs text-ink/70">
                  No obligation until a match is confirmed
                </span>
                <span className="inline-flex items-center rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs text-ink/70">
                  Reservations verified before payment is finalized
                </span>
              </div>
            </div>
            <Card surface="light" className="relative space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Calculator Sneak Peek</p>
                <EstimateShareControl />
              </div>
              <div className="rounded-3xl bg-white/70 p-5 shadow-inner">
                <p className="text-sm text-muted">
                  Bay Lake Tower at Disney’s Contemporary Resort · Standard  View
                </p>
                <p className="mt-2 text-sm text-muted">Deluxe Studio · 4 nights</p>
                <p className="mt-2 text-sm text-muted">June 18–22, 2026</p>
                <div className="mt-3 flex justify-center">
                  <span className="inline-flex rounded-full bg-[#0B1B3A] px-5 py-2 text-lg font-medium text-white">
                    72 points · $1,656 est.
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted">
                  Save up to 50% compared to Disney cash rates, with deluxe resort perks included.
                </p>
                <p className="mt-2 text-xs text-muted">
                  Example pricing based on a 7-month booking window at $23 per point. Availability
                  confirmed by our concierge team before booking.
                </p>
              </div>
              <p className="text-xs text-muted">Deposits stay refundable until we match you.</p>
            </Card>
          </section>

          <section className="mt-24 space-y-12">
            <SectionHeader
              eyebrow="Why Guests Love PixieDVC"
              title="A better way to book DVC stays"
              description="Verified owner matches, transparent coordination, and professional support throughout your booking."
            />
            <div className="grid gap-6 sm:grid-cols-3">
              {reasons.map((item) => (
                <Card key={item.title}>
                  <h3 className="font-display text-xl text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted">{item.description}</p>
                </Card>
              ))}
            </div>
            <p className="text-sm text-muted">
              PixieDVC works directly with verified owners to deliver confirmed stays, transparent pricing, and contract-backed bookings.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

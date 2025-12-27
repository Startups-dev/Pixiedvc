import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Hero } from "@/components/hero";

const resortShowcase = [
  {
    name: "Bay Lake Tower",
    location: "Magic Kingdom Skyline",
    vibe: "Firework-view villas with monorail at your doorstep.",
    points: "18-32 pts/night",
    slug: "bay-lake-tower",
  },
  {
    name: "Aulani",
    location: "Ko Olina, Hawai'i",
    vibe: "Island storytelling, lazy rivers, and oceanfront aloha.",
    points: "22-40 pts/night",
    slug: "aulani",
  },
  {
    name: "Grand Floridian",
    location: "Victorian Splendor",
    vibe: "Five-star charm with spa rituals and pianist serenades.",
    points: "24-38 pts/night",
    slug: "grand-floridian-villas",
  },
];

const testimonials = [
  {
    quote:
      "PixieDVC turned our wish list into a dream itinerary in minutes. The trip builder even rescued a few stray points!",
    name: "Elena & Marco",
    role: "Founders | Park Hoppers",
  },
  {
    quote:
      "From resale research to luxe resort vibes, everything feels crafted for superfans like us.",
    name: "Tasha A.",
    role: "DVC Member Since 2015",
  },
];

const membershipPerks = [
  {
    title: "Live Member Snapshot",
    detail: "Points balance, banking deadlines, and upcoming stays in a single enchanted view.",
  },
  {
    title: "Concierge Chat",
    detail: "Real humans, curated recommendations, and insider park tips when you need them.",
  },
  {
    title: "Family Collaboration",
    detail: "Invite loved ones to co-create itineraries and manage Club access with ease.",
  },
];

const memberMoments = [
  {
    name: "The Rivera Family",
    quote: "Stayed at Riviera using PixieDVC — concierge moved our dining to match fireworks!",
    resort: "Disney's Riviera Resort",
    image: "/images/member-rivera.svg",
    slug: "riviera-resort",
  },
  {
    name: "Elena & Marco",
    quote: "Bay Lake Tower theme-park mornings, Animal Kingdom evenings — effortless magic.",
    resort: "Bay Lake Tower",
    image: "/images/member-elena.svg",
    slug: "bay-lake-tower",
  },
  {
    name: "The Nakamuras",
    quote: "Aulani sunrise villa — PixieDVC handled every time zone and celebration detail.",
    resort: "Aulani Resort",
    image: "/images/member-nakamura.svg",
    slug: "aulani",
  },
];

export default function Home() {
  return (
    <>
      <Hero />

      <main className="bg-surface text-ink">
        <section className="bg-white/85 py-16 backdrop-blur">
            <div className="mx-auto max-w-6xl px-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">
                    <Sparkles className="mr-2 inline-block h-3 w-3 align-middle text-brand" />
                    Real Members, Real Magic
                  </p>
                  <h2 className="font-display text-3xl text-ink sm:text-4xl">
                    Stories from families matching with PixieDVC every week.
                  </h2>
                </div>
                <p className="max-w-md text-sm text-muted">
                  Concierge teams tailor every itinerary with character breakfasts, celebration surprises, and the perfect villa view.
                </p>
              </div>
              <div className="mt-10 grid gap-6 md:grid-cols-3">
                {memberMoments.map((moment) => (
                  <Link
                    key={moment.name}
                    href={`/resorts/${moment.slug}#availability`}
                    className="group overflow-hidden rounded-[28px] bg-white shadow-[0_28px_65px_rgba(15,23,42,0.12)] transition hover:-translate-y-1 hover:shadow-[0_36px_80px_rgba(15,23,42,0.18)]"
                  >
                    <div className="member-frame h-40 w-full">
                      <Image
                        src={moment.image}
                        alt={`${moment.name} enjoying a PixieDVC stay`}
                        fill
                        sizes="(min-width: 768px) 33vw, 100vw"
                      />
                    </div>
                    <div className="space-y-3 p-6">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">{moment.resort}</p>
                      <p className="font-display text-xl text-ink">{moment.name}</p>
                      <p className="text-sm text-muted">“{moment.quote}”</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

        <section id="resorts" className="bg-white/70 py-16 backdrop-blur">
            <div className="mx-auto max-w-6xl px-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">Resort Stories</p>
                  <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
                    Handpicked escapes for every kind of dreamer.
                  </h2>
                </div>
                <Link
                  href="/resorts"
                  className="inline-flex items-center gap-2 rounded-full border border-ink/10 px-5 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
                >
                  View all resorts
                </Link>
              </div>
              <div className="mt-10 grid gap-6 md:grid-cols-3">
                {resortShowcase.map((resort) => (
                  <Link
                    key={resort.name}
                    href={`/resorts/${resort.slug}#gallery`}
                    className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_22px_50px_rgba(15,23,42,0.12)] transition hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(15,23,42,0.16)]"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#A7F3D022,transparent_55%)] opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="relative space-y-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-brand">
                        {resort.location}
                      </p>
                      <h3 className="font-display text-2xl text-ink">
                        {resort.name}
                      </h3>
                      <p className="text-sm text-muted">{resort.vibe}</p>
                      <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-xs font-semibold text-brand">
                        {resort.points}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

        <section
            id="trip-builder"
            className="relative isolate overflow-hidden bg-deep py-20 text-white"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#2E8FFF55_0%,transparent_60%),radial-gradient(circle_at_bottom,#C5A8FF66_0%,transparent_55%)]" />
            <div className="relative mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div className="space-y-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/70">
                  Trip Builder
                </p>
                <h2 className="font-display text-3xl sm:text-4xl">
                  From wish list to booked stay in under five minutes.
                </h2>
                <p className="text-base text-white/75">
                  Answer a few imaginative prompts - favorite characters, travel pace, celebration moments - and we orchestrate the perfect combination of villas, dining, and experiences matched to your points strategy.
                </p>
          <ul className="space-y-4 text-sm text-white/80">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
                  <span>Intelligent availability search spanning DVC and partner resorts.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
                  <span>Points calculator that unlocks hidden value (hello, weeknight deals!).</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
                  <span>Personalized itinerary with export-to-calendar and shareable storybook.</span>
                </li>
              </ul>
                <Link
                  href="#waitlist"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-deep shadow-lg transition hover:-translate-y-0.5"
                >
                  Get Early Access
                  <span aria-hidden="true">-&gt;</span>
                </Link>
              </div>
              <div className="grid gap-4 rounded-[32px] bg-white/10 p-6 shadow-[0_30px_70px_rgba(8,12,20,0.6)] backdrop-blur">
                <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                      Vibe Mixer
                    </p>
                    <p className="mt-1 text-sm text-white">
                      Magical park mornings and relaxed resort evenings
                    </p>
                  </div>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                    92% Match
                  </span>
                </div>
                <div className="grid gap-4 rounded-2xl bg-white/12 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                    Suggested Flow
                  </p>
                  <div className="space-y-3 text-sm text-white/80">
                    <p>Day 1 | Check-in at Bay Lake Tower theme park view</p>
                    <p>Day 2 | Crescent Lake brunch + evening fireworks cruise</p>
                    <p>Day 3 | Aulani preview session with concierge tips</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/75">
                  Sparkle Tip: Shift one night midweek to save up to 4 points while keeping the same villa category.
                </div>
              </div>
            </div>
          </section>

        <section id="membership" className="py-20">
            <div className="mx-auto max-w-6xl px-6">
              <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-6">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">
                    Member Experience
                  </p>
                  <h2 className="font-display text-3xl text-ink sm:text-4xl">
                    Elevate your membership with concierge-grade insights.
                  </h2>
                  <p className="text-base text-muted">
                    The PixieDVC dashboard centralizes every detail - from points strategy to reservation alerts - so seasoned members and newcomers alike stay in the glow.
                  </p>
                  <div className="grid gap-5 sm:grid-cols-3">
                    {membershipPerks.map((perk) => (
                      <div
                        key={perk.title}
                        className="rounded-3xl border border-ink/5 bg-white/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                      >
                        <h3 className="font-display text-lg text-ink">
                          {perk.title}
                        </h3>
                        <p className="mt-2 text-sm text-muted">{perk.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -inset-6 rounded-[36px] border border-brand/40 opacity-50" />
                  <div className="relative space-y-6 rounded-[32px] bg-white/80 p-8 shadow-[0_35px_70px_rgba(15,23,42,0.16)]">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-brand">
                        Sparkles Earned
                      </p>
                      <p className="mt-2 text-4xl font-display text-ink">4,820</p>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
                      <span>Upcoming Stay</span>
                      <span className="font-semibold text-ink">Copper Creek | Jun 2025</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>Waitlist Confidence</span>
                        <span className="font-semibold text-ink">High</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>Banked into 2026</span>
                        <span className="font-semibold text-ink">38 pts</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>Exclusive Offers</span>
                        <span className="font-semibold text-brand">3 new</span>
                      </div>
                    </div>
                    <Link
                      href="#waitlist"
                      className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_45px_rgba(46,143,255,0.35)] transition hover:-translate-y-0.5"
                    >
                      Request a Concierge Demo
                      <span aria-hidden="true">-&gt;</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-20">
            <div className="mx-auto max-w-6xl px-6">
              <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                <div className="space-y-6">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">Member Voices</p>
                  <h2 className="font-display text-3xl text-ink sm:text-4xl">
                    Trusted by superfans crafting unforgettable stays.
                  </h2>
                  <p className="text-base text-muted">
                    From seasoned DVC planners to first-time visitors, members rave about how PixieDVC removes friction while preserving every ounce of wonder.
                  </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  {testimonials.map((testimonial) => (
                    <figure
                      key={testimonial.name}
                      className="rounded-3xl border border-ink/5 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.1)]"
                    >
                      <blockquote className="text-sm text-muted">
                        &ldquo;{testimonial.quote}&rdquo;
                      </blockquote>
                      <figcaption className="mt-4">
                        <p className="font-display text-base text-ink">{testimonial.name}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted">
                          {testimonial.role}
                        </p>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </div>
          </section>

        <section id="stories" className="bg-surface-dark py-20 text-white">
            <div className="mx-auto max-w-6xl px-6">
              <div className="xl:grid xl:grid-cols-[1.1fr_0.9fr] xl:items-center xl:gap-12">
                <div className="space-y-6">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/60">
                    Community Stories
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl">
                    Learn from fellow members, Imagineers, and park storytellers.
                  </h2>
                  <p className="text-base text-white/75">
                    Dive into guides, interviews, and itineraries from families who know how to capture every sparkle of Disney magic.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <article className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                      <h3 className="font-display text-xl">The Ultimate Monorail Crawl</h3>
                      <p className="mt-2 text-sm text-white/70">
                        A member-curated evening that pairs monorail moments with signature dining.
                      </p>
                    </article>
                    <article className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                      <h3 className="font-display text-xl">Resale Reflections</h3>
                      <p className="mt-2 text-sm text-white/70">
                        Unlock value with a guide to contracts, ROFR watchlists, and negotiation scripts.
                      </p>
                    </article>
                  </div>
                  <Link
                    href="#"
                    className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white"
                  >
                    View the Storybook Library
                    <span aria-hidden="true">-&gt;</span>
                  </Link>
                </div>
                <div className="mt-10 xl:mt-0">
                  <div className="space-y-4 rounded-[32px] bg-white/10 p-6 shadow-[0_28px_60px_rgba(8,12,20,0.45)] backdrop-blur">
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span>Featured Podcast</span>
                      <span>New Episode</span>
                    </div>
                    <h3 className="font-display text-2xl text-white">
                      Designing Magic with former Imagineer Laila M.
                    </h3>
                    <p className="text-sm text-white/70">
                      Hear how PixieDVC blends narrative-driven UX with operational efficiency across parks and resorts.
                    </p>
                    <button className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-deep transition hover:-translate-y-0.5">
                      Listen & Subscribe
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
      </main>

      <footer className="border-t border-white/50 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-display text-ink">PixieDVC</p>
              <p className="mt-2 text-sm text-muted">
                Disney magic meets boutique tech. Crafted with wonder in Orlando & beyond.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
              <Link href="/our-story" className="transition hover:text-brand">
                Our Story
              </Link>
              <Link href="#" className="transition hover:text-brand">
                Privacy
              </Link>
              <Link href="#" className="transition hover:text-brand">
                Accessibility
              </Link>
              <Link href="#" className="transition hover:text-brand">
                Careers
              </Link>
              <Link href="#" className="transition hover:text-brand">
                Instagram
              </Link>
              <Link href="#" className="transition hover:text-brand">
                Threads
              </Link>
            </div>
          </div>
      </footer>
    </>
  );
}

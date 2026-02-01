import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Hero } from "@/components/hero";
import BridgeChips from "@/components/BridgeChips";
import ResortShowcase from "@/components/ResortShowcase";
import ResortCollectionCard from "@/components/ResortCollectionCard";
import ContextualGuides from "@/components/guides/ContextualGuides";
import { STORIES } from "@/content/stories";

const resortShowcase = [
  {
    name: "Bay Lake Tower",
    location: "Magic Kingdom Access",
    vibe: "Walkable Magic Kingdom access + monorail convenience.",
    points: "18–32 nightly",
    image: "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake-tower/BTC1.png",
    micro: "Popular for short Magic Kingdom stays",
    slug: "bay-lake-tower",
  },
  {
    name: "Aulani",
    location: "Island Escape",
    vibe: "Oceanfront villas, lazy rivers, and true island calm.",
    points: "22–40 nightly",
    image: "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Aulani/Aul1.png",
    micro: "Loved for relaxed resort days",
    slug: "aulani",
  },
  {
    name: "Grand Floridian",
    location: "Iconic Luxury",
    vibe: "Classic elegance near EPCOT dining and evening strolls.",
    points: "24–38 nightly",
    image: "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/grand-floridian-villas/GFV1.png",
    micro: "Often chosen for first-time Disney trips",
    slug: "grand-floridian-villas",
  },
];

const testimonials = [
  {
    quote:
      "PixieDVC turned our wish list into a dream itinerary in minutes. The trip builder even saved us a few surprises.",
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

export default function Home() {
  return (
    <>
      <Hero />

      <main className="bg-surface text-ink">
        {/* // Static Bridge Section */}
        <section className="relative py-12 md:py-14">
          <div className="relative z-10 mx-auto max-w-6xl px-6">
            <div className="flex flex-col items-center gap-6 text-center">
              <h2 className="font-display text-2xl font-semibold text-[#0B1B3A] sm:text-3xl">
                A calmer way to secure a DVC stay.
              </h2>
              <BridgeChips />
            </div>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-28 bg-gradient-to-b from-white to-transparent"
          />
        </section>

        {/* // Resort Showcase Section */}
        <ResortShowcase />

        <section className="bg-white/85 py-16 backdrop-blur">
            <div className="mx-auto max-w-6xl px-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">
                    Real Members, Real Magic
                  </p>
                  <h2 className="font-display text-3xl text-ink sm:text-4xl">
                    Stories from families matching with PixieDVC every week.
                  </h2>
                </div>
                <div className="max-w-md" />
              </div>
              <div className="mt-10 grid gap-6 md:grid-cols-3">
                {STORIES.map((story, index) => {
                  if (process.env.NODE_ENV === "development") {
                    console.log("[stories] image url", story.imageUrl);
                  }
                  return (
                    <div
                      key={story.id}
                      className="rounded-3xl border border-slate-200/60 bg-white shadow-[0_30px_80px_rgba(2,6,23,0.10)] transition-transform duration-150 ease-out hover:-translate-y-1 hover:shadow-[0_36px_80px_rgba(2,6,23,0.12)]"
                    >
                      <div className="relative h-44 w-full overflow-hidden rounded-3xl bg-slate-100 sm:h-52 md:h-56">
                        <img
                          src={story.imageUrl}
                          alt={story.imageAlt}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
                      </div>
                      <div className="space-y-3 p-6">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                          {story.resortLabel}
                        </p>
                        <p className="text-xl font-semibold text-[#0F2148]">{story.title}</p>
                        <p className="text-sm leading-relaxed text-slate-600">“{story.quote}”</p>
                        {index === 0 ? (
                          <p className="text-xs text-slate-500">Verified PixieDVC guest</p>
                        ) : null}
                        <p className="text-xs font-semibold text-slate-600">{story.proofLine}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

        <section id="resorts" className="bg-white/70 py-16 backdrop-blur">
            <div className="mx-auto max-w-6xl px-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">Resort Collection</p>
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
                  <ResortCollectionCard
                    key={resort.name}
                    name={resort.name}
                    location={resort.location}
                    vibe={resort.vibe}
                    points={resort.points}
                    image={resort.image}
                    micro={resort.micro}
                    slug={resort.slug}
                  />
                ))}
              </div>
            </div>
          </section>

        <section className="py-20">
            <div className="mx-auto max-w-6xl px-6">
              <ContextualGuides
                title="New to DVC? Start Here"
                description="Short, practical guides to help you book with confidence."
                category="DVC Basics"
                limit={3}
              />
            </div>
          </section>

        <div className="h-[90px] w-full bg-[linear-gradient(to_bottom,rgba(255,255,255,1)_0%,rgba(255,255,255,0.85)_40%,rgba(255,255,255,0)_100%)]" />
        <section
            id="PixieBooking"
            className="relative isolate overflow-hidden py-20 text-white"
          >
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#1c3b6e_0%,#0b1b3a_45%,#07152c_100%)]" />
            <div className="relative mx-auto max-w-6xl px-6 pt-12 -mt-10">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-white/60">
                  Pixie Booking
                </p>
                <h2 className="mt-4 max-w-[600px] font-display text-[28px] font-semibold leading-[1.3] tracking-[-0.02em] !text-white sm:text-[34px]">
                  Verified owners, clear steps, and full control — from request to confirmation.
                </h2>
                <div className="mt-4">
                  <span className="inline-flex rounded-full bg-white/6 px-3 py-1.5 text-[10px] font-medium text-white/70">
                    A concierge-led way to book Disney Vacation Club stays.
                  </span>
                </div>
              </div>
              <div className="mt-12 grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-6">
                  <p className="text-[50px] font-semibold leading-none text-white">01</p>
                  <h3 className="mt-3 text-lg font-semibold !text-white">
                    Share your travel details
                  </h3>
                  <p className="mt-2 text-sm text-white/75">
                    Tell us your preferred dates, party size, and resort interests. No commitment,
                    just the information we need to guide you correctly.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-6">
                  <p className="text-[50px] font-semibold leading-none text-white">02</p>
                  <h3 className="mt-3 text-lg font-semibold !text-white">
                    We verify real availability
                  </h3>
                  <p className="mt-2 text-sm text-white/75">
                    We match your request with verified Disney Vacation Club owners and confirm
                    availability for your stay. You don’t chase listings. We handle the coordination.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-6">
                  <p className="text-[50px] font-semibold leading-none text-white">03</p>
                  <h3 className="mt-3 text-lg font-semibold !text-white">
                    Review before anything is booked
                  </h3>
                  <p className="mt-2 text-sm text-white/75">
                    You receive a clear overview of:
                    <span className="mt-2 block text-xs leading-relaxed text-white/70">
                      • Resort and villa details
                      <br />
                      • Dates and stay specifics
                      <br />
                      • Total cost and payment terms
                    </span>
                    Take your time. Ask questions. Nothing moves forward without your approval.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-6">
                  <p className="text-[50px] font-semibold leading-none text-white">04</p>
                  <h3 className="mt-3 text-lg font-semibold !text-white">
                    Confirm with confidence
                  </h3>
                  <p className="mt-2 text-sm text-white/75">
                    Once you’re ready, you secure your stay through our protected payment flow.
                    Your PixieDVC concierge stays with you through booking and beyond.
                  </p>
                </div>
              </div>
              <p className="mt-8 text-xs uppercase tracking-[0.2em] text-white/60">
                ✔ Verified owners • Secure payments • Concierge-led support
              </p>
              <p className="mt-2 text-xs text-white/50">Advanced planning tools coming soon.</p>
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
    </>
  );
}

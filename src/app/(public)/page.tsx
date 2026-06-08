import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { Hero } from "@/components/hero";
import EmailLeadCapture from "@/components/EmailLeadCapture";
import BridgeChips from "@/components/BridgeChips";
import ResortShowcase from "@/components/ResortShowcase";
import ResortCollectionCard from "@/components/ResortCollectionCard";
import ContextualGuides from "@/components/guides/ContextualGuides";
import ReadyStaysEmptyState from "@/components/ready-stays-showcase/ReadyStaysEmptyState";
import ReadyStaysSection from "@/components/ready-stays-showcase/ReadyStaysSection";
import { STORIES } from "@/content/stories";
import {
  foundingOwnerLaunchDiagnosticsEnabled,
  getFoundingOwnerLaunchDiagnostics,
  shouldShowFoundingOwnerLaunch,
} from "@/lib/founding-owner-launch";
import { getActivePromotion } from "@/lib/pricing-promotions";
import {
  READY_STAYS_SHOWCASE_FLAGS,
} from "@/lib/ready-stays/showcase-mock";
import { getHomeReadyStaysShowcase } from "@/lib/ready-stays/showcase-live";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase-service-client";

export const dynamic = "force-dynamic";

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

// Launch Phase: Testimonials temporarily hidden. Re-enable when sufficient verified reviews are available.
const SHOW_HOME_STORIES_FOR_LAUNCH = false;

export default async function Home() {
  noStore();
  let shouldShowNewsletterSignup = true;
  let activePromotion = null;
  try {
    const serviceClient = createServiceClient();
    const promotionResult = await getActivePromotion({ adminClient: serviceClient });
    activePromotion = promotionResult.data;
    if (promotionResult.error && foundingOwnerLaunchDiagnosticsEnabled()) {
      console.warn("[FoundingOwnerLaunch] promotion lookup warning", {
        message: promotionResult.error.message,
      });
    }
  } catch (error) {
    if (foundingOwnerLaunchDiagnosticsEnabled()) {
      console.warn("[FoundingOwnerLaunch] promotion lookup failed", {
        message: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
  const foundingOwnerLaunchDiagnostics = getFoundingOwnerLaunchDiagnostics(activePromotion);
  if (foundingOwnerLaunchDiagnosticsEnabled()) {
    console.info("[FoundingOwnerLaunch]", foundingOwnerLaunchDiagnostics);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const normalizedEmail = user?.email?.trim().toLowerCase() ?? "";
    if (normalizedEmail) {
      const adminClient = getSupabaseAdminClient();
      if (adminClient) {
        const { data: subscriber, error: subscriberError } = await adminClient
          .from("email_subscribers")
          .select("id")
          .eq("email", normalizedEmail)
          .eq("status", "subscribed")
          .maybeSingle();

        if (subscriberError) {
          console.warn("[newsletter-signup] subscriber lookup failed", {
            email: normalizedEmail,
            message: subscriberError.message,
          });
        } else if (subscriber?.id) {
          shouldShowNewsletterSignup = false;
        }
      }
    }
  } catch (error) {
    console.warn("[newsletter-signup] visibility check failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }

  const showFoundingOwnerLaunch = shouldShowFoundingOwnerLaunch(activePromotion);
  const homeReadyStays = await getHomeReadyStaysShowcase(3);

  return (
    <>
      {showFoundingOwnerLaunch ? (
        <section className="bg-[#08152f] text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm leading-6 text-white/86">
              <span className="font-semibold text-white">Founding Owner Launch</span>
              {" — "}
              Join during June and receive +$2/pt above standard payout rates for your first 2 years.
            </p>
            <Link
              href="/owners"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/18 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/16 lg:w-auto"
            >
              Become a Founding Owner
            </Link>
          </div>
        </section>
      ) : null}
      <Hero />
      {showFoundingOwnerLaunch ? (
        <section className="border-b border-[#dce6f7] bg-[linear-gradient(180deg,#f6f9ff_0%,#ffffff_100%)]">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="order-2 lg:order-1">
              <div className="relative overflow-hidden rounded-[34px] border border-[#d8e3f8] bg-[radial-gradient(circle_at_top_left,rgba(91,120,255,0.2),transparent_38%),linear-gradient(155deg,#11244b_0%,#17325f_58%,#1d457e_100%)] p-7 shadow-[0_28px_70px_rgba(15,33,72,0.16)] sm:p-8">
                <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/58">Boosted launch payout</p>
                    <p className="mt-3 text-3xl font-semibold text-white">+$2/pt</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">Above standard payout rates for your first 2 years.</p>
                  </div>
                  <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/58">Founder access</p>
                    <p className="mt-3 text-lg font-semibold text-white">Ready Stay priority</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">Earlier access to high-intent listing opportunities.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/58">Founder positioning</p>
                      <p className="mt-2 text-xl font-semibold text-white">Concierge-supported from application through first bookings</p>
                    </div>
                    <div className="rounded-full border border-white/14 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/78">
                      June only
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      "Priority owner visibility",
                      "Founding Owner status",
                      "Human concierge support",
                    ].map((item) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-[#0b1d3f]/55 px-4 py-3 text-sm text-white/76">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-xs uppercase tracking-[0.28em] text-[#5c6f98]">Founding Owner Launch</p>
              <h2 className="mt-4 max-w-[15ch] text-4xl font-semibold leading-[1.04] text-[#0F2148] sm:text-5xl">
                Join PixieDVC during our June launch and lock in boosted payout rates for your first 2 years.
              </h2>
              <p className="mt-5 max-w-[58ch] text-[16px] leading-8 text-[#53627e]">
                Built for owners who want a calmer, more premium way to place points and confirmed reservations with concierge support and stronger launch visibility.
              </p>

              <ul className="mt-8 space-y-3 text-[15px] leading-7 text-[#24334f]">
                <li>• +$2/pt above standard payout rates</li>
                <li>• Priority owner visibility</li>
                <li>• Founding Owner status</li>
                <li>• Early access to Ready Stay opportunities</li>
                <li>• Concierge-supported matching</li>
              </ul>

              <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/owners"
                  className="inline-flex items-center justify-center rounded-full bg-[#0F2148] px-6 py-3 text-sm font-semibold !text-white shadow-[0_16px_34px_rgba(15,33,72,0.22)] transition hover:-translate-y-[1px] hover:bg-[#173465]"
                >
                  Apply as an Owner
                </Link>
                <p className="text-sm text-[#6a7891]">
                  Available to approved owners joining during June only.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      {shouldShowNewsletterSignup ? (
        <section className="mx-auto max-w-7xl px-6 pt-6">
          <EmailLeadCapture
            source="hero_bar"
            headline="Get Disney deals before they’re gone"
            body="Join thousands of savvy travelers and get early access to Ready Stays, last-minute offers, and exclusive Disney villa deals."
            buttonLabel="Get Disney Deals"
            helperText="No spam. Unsubscribe anytime."
            placeholder="Enter your email"
            className="rounded-[36px] bg-[radial-gradient(circle_at_top,rgba(81,118,255,0.14),transparent_52%),linear-gradient(180deg,#fbfdff_0%,#f7f9ff_100%)] px-5 py-8 shadow-[0_26px_60px_rgba(15,33,72,0.08)] sm:px-8 sm:py-10"
            innerClassName="mx-auto max-w-6xl"
            align="center"
            variant="homepage_hero"
          />
        </section>
      ) : null}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-slate-900">Two Ways to Secure Your Stay</h2>
          <p className="mt-3 text-slate-500">
            Choose the approach that fits how you plan. Flexible matching or confirmed reservations ready now.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md">
            <div className="mb-6 h-48 w-full overflow-hidden rounded-xl bg-slate-100">
              <img
                src="https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/main%20page%20ready-stay/PixieMatching.png"
                alt="Family planning a Disney Vacation Club stay"
                className="h-full w-full object-cover"
              />
            </div>

            <h3 className="text-xl font-semibold text-slate-950">Request Your Stay</h3>

            <p className="mt-4 max-w-[52ch] text-slate-600">
              Share your dates, preferred resort, and party details. We verify availability with real DVC owners and
              guide you step by step.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>• Personalized matching</li>
              <li>• Transparent pricing before you commit</li>
              <li>• Concierge support from start to confirmation</li>
            </ul>

            <div className="mt-7">
              <Link
                href="/check-dates"
                className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium !text-white transition hover:bg-indigo-500"
              >
                Check My Dates →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md">
            <div className="mb-6 h-48 w-full overflow-hidden rounded-xl bg-slate-100">
              <img
                src="https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/main%20page%20ready-stay/ready-stay.png"
                alt="Confirmed Disney Vacation Club villa"
                className="h-full w-full object-cover"
              />
            </div>

            <h3 className="text-xl font-semibold text-slate-950">Browse Ready Stays</h3>

            <p className="mt-4 max-w-[52ch] text-slate-600">
              Confirmed DVC reservations available now. Secure premium villas without waiting for matching.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>• Pre-confirmed reservations</li>
              <li>• Ideal for flexible or last-minute trips</li>
              <li>• Updated inventory</li>
            </ul>

            <div className="mt-7">
              <Link
                href="/ready-stays"
                className="inline-flex items-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition transform-gpu hover:-translate-y-0.5 hover:bg-slate-50"
              >
                View Ready Stays →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-sm text-slate-500">
          Verified owners • Secure payments • Concierge-led support
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 pb-8">
        <EmailLeadCapture
          source="post_intent"
          headline="Want deals like these before they sell out?"
          body="We’ll send you new availability and last-minute opportunities as they appear."
          buttonLabel="Get Alerts"
          align="center"
          className="rounded-[32px] border border-slate-200/80 bg-white px-6 py-8 shadow-[0_26px_60px_rgba(15,33,72,0.08)] sm:px-10"
          innerClassName="mx-auto max-w-3xl"
        />
      </section>
      {READY_STAYS_SHOWCASE_FLAGS.enableHomeReadyStays ? (
        homeReadyStays.length ? (
          <ReadyStaysSection
            title="Book Instantly — Available Now"
            subtitle="Pre-confirmed stays you can secure right now. No request needed."
            items={homeReadyStays}
          />
        ) : (
          <ReadyStaysEmptyState />
        )
      ) : null}
      <section className="h-24 bg-gradient-to-b from-white to-slate-100" aria-hidden="true" />

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

        <section id="resorts" className="bg-slate-50 pt-24 pb-20">
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
              <EmailLeadCapture
                source="resort_section"
                headline="Track prices for these resorts"
                body="Get notified when availability and pricing change."
                buttonLabel="Track Prices"
                className="mt-8 rounded-[28px] border border-[#dfe6f5] bg-white/80 px-5 py-5 shadow-[0_14px_32px_rgba(15,33,72,0.05)]"
                innerClassName="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8"
                compact
              />
            </div>
          </section>

        {SHOW_HOME_STORIES_FOR_LAUNCH ? (
        <section className="relative bg-white/85 py-16 backdrop-blur">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#0B1B3A]/10"
            />
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
                        <p className="text-sm leading-relaxed text-slate-500">“{story.quote}”</p>
                        {index === 0 ? (
                          <p className="text-xs text-slate-500">Verified PixieDVC guest</p>
                        ) : null}
                        <p className="text-xs font-semibold text-slate-500">{story.proofLine}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

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
            </div>
          </section>

        <section className="mx-auto max-w-5xl px-6 py-6">
          <EmailLeadCapture
            source="bottom_cta"
            headline="Not ready to book yet?"
            body="We’ll send you the best Disney stays as they become available."
            buttonLabel="Get Deals"
            className="rounded-[32px] border border-[#dbe3f6] bg-[linear-gradient(135deg,rgba(247,249,255,0.95),rgba(255,255,255,0.98))] px-6 py-8 shadow-[0_24px_55px_rgba(15,33,72,0.08)]"
            innerClassName="mx-auto max-w-3xl"
            align="center"
          />
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

        {/* Community Stories temporarily hidden for launch focus.
            Will be reintroduced once Storybook/Podcast content is live. */}
        {false && (
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
        )}
      </main>
    </>
  );
}

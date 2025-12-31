import Image from "next/image";
import Link from "next/link";

import { Button } from "@pixiedvc/design-system";
import { ResortScroller } from "@/components/resort-scroller";
import { getPublicMarketMetrics } from "@/lib/market-metrics";
import { getResortSummaries } from "@/lib/resorts";
import ReferralLink from "@/components/referral/ReferralLink";

const CURATED_FEATURED = [
  {
    slug: "bay-lake-tower",
    name: "Bay Lake Tower",
    location: "Magic Kingdom Skyline",
    tags: ["Monorail", "Firework Views"],
    pointsRange: "18–32 nightly",
    cardImage: "/images/Bay Lake.png",
  },
  {
    slug: "grand-floridian-villas",
    name: "Grand Floridian Villas",
    location: "Seven Seas Lagoon",
    tags: ["Victorian", "Spa"],
    pointsRange: "22–40 nightly",
    cardImage: "/images/Beach Club.png",
  },
  {
    slug: "riviera-resort",
    name: "Disney's Riviera Resort",
    location: "Epcot Resort Area",
    tags: ["Skyliner", "European Flair"],
    pointsRange: "20–38 nightly",
    cardImage: "/images/Riviera.png",
  },
  {
    slug: "polynesian-villas",
    name: "Polynesian Villas & Bungalows",
    location: "Seven Seas Lagoon",
    tags: ["Overwater", "Dole Whip"],
    pointsRange: "24–50 nightly",
    cardImage: "/images/Polynesian.png",
  },
];

export async function Hero() {
  const liveResorts = await getResortSummaries();
  const metrics = await getPublicMarketMetrics("walt-disney-world");
  const updatedHours = metrics.updatedAt
    ? Math.max(
        1,
        Math.round(
          (Date.now() - new Date(metrics.updatedAt).getTime()) / (1000 * 60 * 60),
        ),
      )
    : null;

  const map = new Map(liveResorts.map((resort) => [resort.slug, resort]));
  const combined = [...liveResorts];

  for (const fallback of CURATED_FEATURED) {
    if (!map.has(fallback.slug)) {
      combined.push(fallback);
    }
  }

  const featuredResorts = combined.slice(0, 10);

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[10] h-[64px] bg-gradient-to-b from-white/28 to-transparent" />

      <div className="absolute inset-0">
        <Image
          src="/images/castle-hero.png"
          alt="Cinderella Castle with monorail at dusk"
          fill
          priority
          sizes="100vw"
          className="h-full w-full scale-[1.04] object-cover object-center brightness-[0.95]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#10152b]/75 via-[#18224a]/55 to-[#272b5c]/85" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_20%,rgba(15,21,49,0.18),rgba(15,21,49,0.55))]" />
      </div>

      <div className="relative z-20 mx-auto max-w-[1200px] px-4 pt-[56px] pb-16 md:px-6 lg:pt-[64px]">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-[620px] space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur">
              Disney Vacation Club reinvented
            </span>
            <h1 className="font-display text-[2.9rem] leading-tight text-white drop-shadow-[0_6px_20px_rgba(12,15,44,0.3)] sm:text-[3.4rem] lg:text-[3.9rem]">
              Stay at Disney’s top resorts for a fraction of the cost.
            </h1>
            <p className="font-sans text-base leading-relaxed text-white/75 sm:text-lg">
              Wake up steps from Cinderella’s Castle, sip coffee on your balcony at Bay Lake Tower, or unwind at
              Aulani’s oceanfront villas—without the high price tag. PixieDVC transforms DVC value into premium
              stays for families who love Disney magic and smart value alike.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <span className="dust-trail" aria-hidden="true" />
                <Button
                  asChild
                  className="bg-gradient-to-r from-[#2b3a70] via-[#384b94] to-[#9aa7ff] text-white shadow-[0_18px_48px_rgba(35,53,107,0.45)] transition duration-300 hover:from-[#f6c64d] hover:via-[#a8b8ff] hover:to-[#9aa7ff] hover:shadow-[0_24px_70px_rgba(35,53,107,0.6)]"
                >
                  <ReferralLink href="/plan">Plan My Stay →</ReferralLink>
                </Button>
              </div>
              <Button
                asChild
                variant="ghost"
                className="border border-white/30 bg-white/10 px-6 py-3 text-white hover:border-lavender hover:bg-white/20"
              >
                <Link href="/how-it-works">See How It Works</Link>
              </Button>
            </div>

            <div className="mt-6 lg:mt-8">
              <ResortScroller resorts={featuredResorts} />
            </div>
          </div>

          <div className="w-full max-w-[360px] self-stretch rounded-3xl border border-white/12 bg-white/10 p-[1.5px] shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-md sm:max-w-[400px]">
            <div className="rounded-3xl bg-[#0f2148]/70 p-8">
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/65">Tonight at the Kingdom</p>
                  <h2 className="mt-3 font-display text-2xl text-white sm:text-[28px]">
                    Bay Lake Tower | Fireworks Vista Villa
                  </h2>
                  <p className="mt-3 text-sm text-white/70">
                    Secure the monorail skyline without the deluxe cash rates. Concierge handles confirmations in
                    under six hours.
                  </p>
                </div>
                <div className="space-y-4 rounded-3xl bg-white/12 p-5 text-sm text-white/85 shadow-[0_18px_36px_rgba(8,12,30,0.35)]">
                  <div className="flex items-center justify-between">
                    <span>Availability Confidence</span>
                    <span className="font-semibold">
                      {metrics.availabilityConfidence.charAt(0).toUpperCase() +
                        metrics.availabilityConfidence.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Typical Match Time</span>
                    <span className="font-semibold">{metrics.typicalMatchTimeLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Verified Owners Ready</span>
                    <span className="font-semibold">{metrics.verifiedOwnersReady}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Booking Window Supported</span>
                    <span className="font-semibold">{metrics.bookingWindowSupported ? "Yes" : "No"}</span>
                  </div>
                  {updatedHours ? (
                    <div className="text-xs text-white/60">Updated {updatedHours} hours ago</div>
                  ) : null}
                </div>
                <div className="rounded-3xl border border-white/20 bg-white/10 px-4 py-5 text-sm text-white/80 backdrop-blur">
                  “PixieDVC matched our wishlist villa within 48 hours — we watched fireworks from the balcony and
                  still came in under budget.”
                </div>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/55">
                  <span>Secure • Refundable • Concierge Guided</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

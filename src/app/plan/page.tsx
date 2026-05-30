import { Suspense } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@pixiedvc/design-system";
import ReferralLink from "@/components/referral/ReferralLink";
import { buildTripIntentQuery, parseTripIntentFromSearchParams } from "@/lib/trip-intent";
import { CANONICAL_RESORT_SLUG_SET, canonicalizeResortSlug } from "@/lib/resorts/canonical";
import { FALLBACK_CALC_CODE_BY_SLUG } from "@/lib/resort-calculator";

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const RESORT_NAME_SLUG_MAP = new Map<string, string>([
  [slugify("Disney's Animal Kingdom Villas - Jambo House"), "animal-kingdom-villas"],
  [slugify("Disney's Animal Kingdom Villas - Kidani Village"), "animal-kingdom-kidani"],
  [slugify("Aulani, Disney Vacation Club Villas"), "aulani"],
  [slugify("Bay Lake Tower at Disney's Contemporary Resort"), "bay-lake-tower"],
  [slugify("Disney's Beach Club Villas"), "beach-club-villas"],
  [slugify("Disney's BoardWalk Villas"), "boardwalk-villas"],
  [slugify("Boulder Ridge Villas at Disney's Wilderness Lodge"), "boulder-ridge-villas"],
  [slugify("Copper Creek Villas & Cabins at Disney's Wilderness Lodge"), "copper-creek-villas"],
  [slugify("The Villas at Disneyland Hotel"), "disneyland-hotel-villas"],
  [slugify("The Cabins at Disney's Fort Wilderness Resort"), "fort-wilderness-cabins"],
  [slugify("The Villas at Disney's Grand Californian Hotel & Spa"), "grand-californian-villas"],
  [slugify("The Villas at Disney's Grand Floridian Resort & Spa"), "grand-floridian-villas"],
  [slugify("Disney's Hilton Head Island Resort"), "hilton-head-island"],
  [slugify("Disney's Old Key West Resort"), "old-key-west"],
  [slugify("Disney's Polynesian Villas & Bungalows"), "polynesian-villas"],
  [slugify("Disney's Riviera Resort"), "riviera-resort"],
  [slugify("Disney's Saratoga Springs Resort & Spa"), "saratoga-springs"],
  [slugify("Disney's Vero Beach Resort"), "vero-beach"],
]);

function resolveResortSlug(value?: string) {
  const normalized = value?.trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  const canonicalSlug = canonicalizeResortSlug(lower);
  if (CANONICAL_RESORT_SLUG_SET.has(canonicalSlug)) {
    return canonicalSlug;
  }

  const upper = normalized.toUpperCase();
  for (const [slug, code] of Object.entries(FALLBACK_CALC_CODE_BY_SLUG)) {
    if (code === upper) {
      return slug;
    }
  }

  const nameSlug = slugify(normalized);
  for (const slug of CANONICAL_RESORT_SLUG_SET) {
    if (slugify(slug) === nameSlug || slugify(slug.replace(/-/g, " ")) === nameSlug) {
      return slug;
    }
  }

  return RESORT_NAME_SLUG_MAP.get(nameSlug) ?? null;
}

export default async function PlanLandingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const tripIntent = parseTripIntentFromSearchParams(resolvedSearchParams);
  const resolvedResortSlug = resolveResortSlug(tripIntent.resort);
  const tripIntentWithCanonicalResort = resolvedResortSlug
    ? { ...tripIntent, resort: resolvedResortSlug }
    : tripIntent;
  const tripQuery = buildTripIntentQuery(tripIntentWithCanonicalResort).toString();
  const readyStaysHref = tripQuery ? `/ready-stays?${tripQuery}` : "/ready-stays";
  const resortsHref = resolvedResortSlug
    ? tripQuery
      ? `/calculator?${tripQuery}`
      : "/calculator"
    : tripQuery
      ? `/plan/resorts?${tripQuery}`
      : "/plan/resorts";
  const guidedHref = tripQuery ? `/plan/guided?${tripQuery}` : "/plan/guided";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#10224b_0%,#182d5d_16%,#eef2fb_42%,#f7f4ef_100%)] text-ink">
      <main className="mx-auto max-w-7xl px-6 py-16 font-sans sm:py-20">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-semibold leading-tight !text-white sm:text-[2.85rem] sm:leading-[1.04]">
            Choose how you&apos;d like to book your Disney villa stay
          </h1>
          <p className="mt-4 text-base leading-7 text-white/76 sm:text-lg">
            Two ways to plan your stay, depending on how you prefer to book.
          </p>
        </section>

        <Suspense fallback={null}>
          <section className="relative mx-auto mt-10 max-w-[1180px]">
            <div className="grid gap-5 lg:grid-cols-2">
              <ReferralLink
                href={readyStaysHref}
                className="group relative min-h-[392px] overflow-hidden rounded-[2rem] bg-[#0f2148] shadow-[0_28px_80px_rgba(15,33,72,0.22)] transition duration-300 hover:-translate-y-[2px] hover:shadow-[0_34px_90px_rgba(15,33,72,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c5fd7]/40"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, rgba(10,20,40,0.06) 0%, rgba(10,20,40,0.16) 22%, rgba(10,20,40,0.82) 76%, rgba(6,12,28,0.92) 100%), linear-gradient(135deg, rgba(6,12,28,0.10) 0%, rgba(6,12,28,0.04) 30%, rgba(6,12,28,0.56) 72%, rgba(6,12,28,0.84) 100%), url(https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Riviera/RR4.png)",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[radial-gradient(circle_at_12%_92%,rgba(4,10,26,0.72),transparent_38%)]"
                />
                <div className="relative flex min-h-[392px] flex-col justify-between p-6 sm:p-7">
                  <div className="max-w-md">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-white/92 backdrop-blur-[2px]">
                      <Sparkles className="h-[14px] w-[14px]" strokeWidth={1.8} />
                      <span>Fastest</span>
                    </div>
                  </div>
                  <div className="max-w-md">
                    <h2 className="text-[2rem] font-semibold leading-[0.98] !text-white sm:text-[2.3rem]">
                      Book instantly
                    </h2>
                    <p className="mt-4 text-[15px] leading-7 text-white/88 sm:text-base">
                      Browse pre-confirmed Disney villa stays already secured by DVC owners.
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/72">No matching required.</p>
                    <div className="mt-6">
                      <Button
                        asChild
                        className="rounded-xl border border-white/10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.04)_42%,rgba(255,255,255,0)_52%),linear-gradient(to_right,#18284d,#4560d2)] px-6 py-3 text-sm shadow-[0_18px_36px_rgba(10,18,42,0.34)]"
                      >
                        <span>Explore Ready Stays</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </ReferralLink>

              <ReferralLink
                href={resortsHref}
                className="group relative min-h-[392px] overflow-hidden rounded-[2rem] bg-[#132653] shadow-[0_30px_84px_rgba(15,33,72,0.24)] transition duration-300 hover:-translate-y-[2px] hover:shadow-[0_36px_96px_rgba(15,33,72,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c5fd7]/40"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, rgba(10,18,38,0.06) 0%, rgba(10,18,38,0.16) 20%, rgba(10,18,38,0.84) 74%, rgba(5,10,24,0.94) 100%), linear-gradient(135deg, rgba(5,10,24,0.08) 0%, rgba(5,10,24,0.02) 28%, rgba(5,10,24,0.62) 72%, rgba(5,10,24,0.88) 100%), url(https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake-tower/BTC1.png)",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[radial-gradient(circle_at_12%_92%,rgba(4,10,26,0.82),transparent_38%)]"
                />
                <div className="relative flex min-h-[392px] flex-col justify-between p-6 sm:p-7">
                  <div className="max-w-lg">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-white/92 backdrop-blur-[2px]">
                      <Search className="h-[14px] w-[14px]" strokeWidth={1.8} />
                      <span>Most flexible</span>
                    </div>
                  </div>
                  <div className="max-w-lg">
                    <h2 className="text-[2rem] font-semibold leading-[0.98] !text-white sm:text-[2.3rem]">
                      Build your stay
                    </h2>
                    <p className="mt-4 max-w-md text-[15px] leading-7 text-white/88 sm:text-base">
                      Choose your resort, dates, and villa type. PixieDVC matches your request with verified DVC owners.
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/72">Best when you already know what you want.</p>
                    <div className="mt-6">
                      <Button
                        asChild
                        className="rounded-xl border border-white/10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.04)_42%,rgba(255,255,255,0)_52%),linear-gradient(to_right,#18284d,#4560d2)] px-6 py-3 text-sm shadow-[0_18px_36px_rgba(10,18,42,0.36)]"
                      >
                        <span>Start my request</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </ReferralLink>
            </div>

            <div className="mx-auto mt-10 max-w-3xl text-center">
              <h2 className="text-[1.65rem] font-semibold leading-tight text-[#10224b] sm:text-[1.85rem]">
                Need help choosing the perfect resort?
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-7 text-[#4b5f87]/84 sm:text-base">
                Answer a few questions and our concierge planner will recommend the best Disney villa options for your
                trip.
              </p>
              <ReferralLink
                href={guidedHref}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#10224b] transition hover:text-[#4457c7]"
              >
                <span>Get resort recommendations</span>
                <span aria-hidden="true">→</span>
              </ReferralLink>
            </div>
          </section>
        </Suspense>
      </main>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import ReferralLink from "@/components/referral/ReferralLink";

const bookingPaths = [
  {
    label: "Custom Matching",
    title: "Request your stay",
    description:
      "For guests who want PixieDVC to help secure a specific Disney villa stay.",
    bullets: [
      "Flexible dates and resort choices",
      "Concierge matching with verified owners",
      "Ideal for planning ahead",
    ],
    href: "/plan",
    cta: "Start a request",
    imageSide: "left",
    image:
      "url(https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Riviera/RR4.png)",
  },
  {
    label: "Pre-confirmed inventory",
    title: "Browse Ready Stays",
    description:
      "For guests who want to choose from Disney villa reservations already secured by DVC owners.",
    bullets: [
      "Confirmed reservations already secured",
      "Faster booking path",
      "Great for last-minute opportunities",
    ],
    href: "/ready-stays",
    cta: "View Ready Stays",
    imageSide: "right",
    image:
      "url(https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Polynesian-villas-and-bungalows/PVB1.png)",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="bg-[linear-gradient(180deg,#f7faff_0%,#ffffff_18%,#f9fbff_100%)] text-slate-900">
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "url(https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/HOW%20to/3dad7522-aa93-4ff1-a91a-52a4d1f1effc.png) center/cover",
          }}
        />
        <div className="relative mx-auto flex min-h-[760px] max-w-6xl items-end px-6 pb-20 pt-24 sm:min-h-[820px] sm:pt-32">
          <div className="max-w-[44rem] rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,40,0.54),rgba(10,20,40,0.42))] px-7 py-9 shadow-[0_40px_80px_rgba(0,0,0,0.16)] backdrop-blur-[1px]">
            <h1 className="text-5xl font-semibold tracking-tight !text-white sm:text-6xl">
              Two ways to plan your Disney villa stay
            </h1>
            <p className="mt-5 max-w-[560px] text-base font-medium leading-8 text-white/82 sm:text-lg">
              Choose between custom trip matching or pre-confirmed Ready Stays already secured by verified DVC owners.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ReferralLink
                href="/plan"
                className="inline-flex items-center rounded-xl bg-[linear-gradient(180deg,#4c5fd7,#4457c7)] px-5 py-3 text-sm font-semibold !text-white shadow-[0_12px_28px_rgba(44,61,140,0.28)] transition hover:brightness-110 hover:shadow-[0_16px_34px_rgba(44,61,140,0.34)] hover:!text-white"
              >
                Find your stay
              </ReferralLink>
              <Link
                href="/ready-stays"
                className="inline-flex items-center rounded-xl border border-white/18 bg-white/10 px-5 py-3 text-sm font-semibold !text-white backdrop-blur-sm transition hover:bg-white/14 hover:!text-white"
              >
                Browse Ready Stays
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#fffdfa_0%,#ffffff_100%)]">
        <div className="mx-auto max-w-6xl px-6 pb-12 pt-10">
        <div className="space-y-8">
          {bookingPaths.map((path) => {
            const imageBlock = (
              <div
                className="min-h-[320px] bg-cover bg-center lg:min-h-[420px]"
                style={{ backgroundImage: path.image }}
              />
            );

            const contentBlock = (
              <div className="flex min-h-[320px] items-center bg-white px-8 py-8 lg:min-h-[420px] lg:px-10">
                <div className="max-w-xl">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#6a7ea3]">{path.label}</p>
                  <h3 className="mt-3 text-[2.1rem] font-semibold tracking-tight text-[#10224b]">{path.title}</h3>
                  <p className="mt-4 text-base leading-8 text-[#5a6d8f]">{path.description}</p>
                  <ul className="mt-6 space-y-3 text-sm text-[#5a6d8f]">
                    {path.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span className="mt-2 h-2 w-2 rounded-full bg-[#4c5fd7]" aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={path.href}
                    className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(180deg,#203b78,#152c5b)] px-5 py-3 text-sm font-semibold !text-white shadow-[0_10px_24px_rgba(15,33,72,0.18)] transition hover:brightness-110 hover:shadow-[0_14px_28px_rgba(15,33,72,0.22)] hover:!text-white"
                  >
                    {path.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );

            return (
              <article
                key={path.title}
                className="overflow-hidden rounded-[2rem] border border-[#dbe4f4] shadow-[0_22px_56px_rgba(16,34,75,0.08)]"
              >
                <div className="grid lg:grid-cols-2">
                  {path.imageSide === "left" ? (
                    <>
                      {imageBlock}
                      {contentBlock}
                    </>
                  ) : (
                    <>
                      {contentBlock}
                      {imageBlock}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,rgba(243,247,255,0.96),rgba(249,251,255,0.99))]">
        <div className="mx-auto max-w-6xl space-y-16 px-6 py-16">
          <div className="text-center">
            <h2 className="text-5xl font-semibold tracking-tight text-[#10224b] sm:text-6xl">How it works</h2>
          </div>
          <article className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-2xl">
              <h3 className="text-[2.6rem] font-semibold tracking-tight text-[#10224b]">Custom Matching</h3>
              <p className="mt-3 text-lg font-medium leading-8 text-[#51678f]">
                Best when you already know the Disney villa experience you want.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Works through", value: "Verified DVC owners" },
                  { label: "Requires", value: "DVC availability" },
                  { label: "Before payment", value: "You review full details" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.4rem] border border-[#dbe4f4] bg-white/86 px-4 py-4 shadow-[0_10px_24px_rgba(15,33,72,0.04)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8fb3]">{item.label}</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#314f98]">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-7 space-y-4 text-[16px] leading-8 text-[#5a6d8f]">
                <p>
                  PixieDVC reviews your requested dates, resort, room type, and flexibility, then looks for verified
                  owners with eligible DVC points that fit your stay.
                </p>
                <p>
                  We search verified owner inventory that fits your requested stay. After that, you review the pricing,
                  agreement, and payment terms before moving forward.
                </p>
              </div>
              <ul className="mt-7 space-y-3 text-sm text-[#5a6d8f]">
                {[
                  "Best for specific dates, resorts, or room types",
                  "Works through verified DVC owners with eligible points",
                  "Availability must be confirmed before the agreement is sent",
                  "You review the details before committing",
                ].map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[#4c5fd7]" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <ReferralLink
                href="/plan"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(180deg,#203b78,#152c5b)] px-5 py-3 text-sm font-semibold !text-white shadow-[0_10px_24px_rgba(15,33,72,0.18)] transition hover:brightness-110 hover:shadow-[0_14px_28px_rgba(15,33,72,0.22)] hover:!text-white"
              >
                Start a custom request
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ReferralLink>
            </div>
            <div
              className="min-h-[340px] rounded-[2rem] shadow-[0_18px_44px_rgba(15,33,72,0.08)]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,20,40,0.04) 0%, rgba(10,20,40,0.08) 22%, rgba(10,20,40,0.24) 74%, rgba(6,12,28,0.42) 100%), url(https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/HOW%20to/ee214afe-1021-4b3f-b45d-fc78f623dfef.png) center/cover",
              }}
            />
          </article>

          <article className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div
              className="order-2 min-h-[340px] rounded-[2rem] shadow-[0_18px_44px_rgba(15,33,72,0.08)] lg:order-1"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,20,40,0.04) 0%, rgba(10,20,40,0.08) 20%, rgba(10,20,40,0.22) 72%, rgba(6,12,28,0.38) 100%), url(https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Boardwalk/BDW1.png) center/cover",
              }}
            />
            <div className="order-1 max-w-2xl lg:order-2 lg:justify-self-end">
              <h3 className="text-[2.6rem] font-semibold tracking-tight text-[#10224b]">Ready Stays</h3>
              <p className="mt-3 text-lg font-medium leading-8 text-[#51678f]">
                Best when you are flexible and want the fastest path to a Disney villa.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Already secured", value: "Reservation in place" },
                  { label: "Best for", value: "Faster booking" },
                  { label: "Inventory", value: "Limited and fixed" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.4rem] border border-[#dbe4f4] bg-white/86 px-4 py-4 shadow-[0_10px_24px_rgba(15,33,72,0.04)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8fb3]">{item.label}</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#314f98]">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-7 space-y-4 text-[16px] leading-8 text-[#5a6d8f]">
                <p>
                  Ready Stays are pre-confirmed Disney villa reservations already secured by DVC owners, with fixed
                  resort, room type, check-in, and check-out details.
                </p>
                <p>
                  Because the reservation is already in place, this is usually the fastest path through PixieDVC.
                  Inventory is limited and may disappear once booked.
                </p>
              </div>
              <ul className="mt-7 space-y-3 text-sm text-[#5a6d8f]">
                {[
                  "Pre-confirmed Disney villa reservations",
                  "Fixed resort, room type, and travel dates",
                  "Faster booking path than custom matching",
                  "Best for flexible travelers and limited-time deals",
                ].map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[#4c5fd7]" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/ready-stays"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(180deg,#203b78,#152c5b)] px-5 py-3 text-sm font-semibold !text-white shadow-[0_10px_24px_rgba(15,33,72,0.18)] transition hover:brightness-110 hover:shadow-[0_14px_28px_rgba(15,33,72,0.22)] hover:!text-white"
              >
                Browse Ready Stays
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-[1.75rem] bg-[#10224b] px-8 py-7 text-center text-white shadow-[0_24px_60px_rgba(16,34,75,0.14)]">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[15px] font-medium text-white/86 sm:text-[16px]">
            <span>Verified DVC owners</span>
            <span className="text-white/34">•</span>
            <span>Disney system reservations</span>
            <span className="text-white/34">•</span>
            <span>Clear agreement before payment</span>
            <span className="text-white/34">•</span>
            <span>Concierge guidance throughout the process</span>
          </div>
        </div>
      </section>
    </main>
  );
}

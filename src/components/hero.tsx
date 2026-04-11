import Image from "next/image";

import { Button } from "@pixiedvc/design-system";
import ReferralLink from "@/components/referral/ReferralLink";

export async function Hero() {
  const heroImageSrc = process.env.NEXT_PUBLIC_HERO_IMAGE_SRC?.trim() || "/images/castle-hero.png";
  const heroImageAlt = heroImageSrc.includes("castle")
    ? "Cinderella Castle with monorail at dusk"
    : "PixieDVC resort hero image";

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={heroImageSrc}
          alt={heroImageAlt}
          fill
          priority
          sizes="100vw"
          className="h-full w-full scale-[1.04] object-cover object-center brightness-[0.95]"
        />
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#050811]/80 via-[#0c1324]/70 to-[#191e47]/90" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_15%,rgba(5,8,17,0.25),rgba(5,8,17,0.75))]" />
          <div className="absolute inset-0 bg-[radial-gradient(130%_80%_at_50%_20%,rgba(15,21,49,0.18),rgba(15,21,49,0.55))]" />
        </>
      </div>

      <div className="relative z-20 mx-auto max-w-[1200px] px-4 pt-[56px] pb-16 md:px-6 lg:pt-[64px]">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="flex max-w-[620px] flex-col lg:max-w-[780px] lg:min-h-[520px]">
            <div>
              <h2 className="mt-2 max-w-[24ch] lg:max-w-[760px] font-display !text-[50px] !leading-[1.03] !font-bold !text-white drop-shadow-[0_6px_20px_rgba(12,15,44,0.3)] sm:!text-[52px] lg:!text-[56px]">
                <span className="block lg:whitespace-nowrap">Stay at Disney&apos;s luxury resorts</span>
                <span className="block lg:whitespace-nowrap">without paying Disney prices.</span>
              </h2>
            </div>
            <p
              className="mt-2 max-w-lg text-xl font-semibold text-white sm:text-2xl"
              style={{ lineHeight: "1.45" }}
            >
              Save 40–60% vs booking direct with Disney
            </p>
            <p
              className="mt-5 max-w-xl font-sans !text-white/70"
              style={{ fontSize: "14px", lineHeight: "1.75" }}
            >
              A concierge-led service that matches you with verified owners, simple, secure, and handled for you.
            </p>
            <div className="mt-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <span className="dust-trail" aria-hidden="true" />
                  <Button
                    asChild
          className="ring-1 ring-white/10 border border-white/15 bg-white/12 px-7 py-3 text-base font-semibold text-white !text-white shadow-[0_8px_20px_rgba(59,130,246,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] transition-transform duration-200 hover:scale-[1.03] hover:bg-white/22"
                  >
                    <ReferralLink href="/plan" className="text-white">
                      Check Availability
                    </ReferralLink>
                  </Button>
                </div>
              </div>
              <div className="mt-6 inline-flex items-center gap-x-8 text-xs tracking-[0.08em] text-white/85">
                <span className="inline-flex items-center">
                  <span className="mr-2 text-[10px] text-green-400">✔</span>
                  Verified owners
                </span>
                <span>•</span>
                <span>Secure payments</span>
                <span>•</span>
                <span>Concierge support</span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[320px] self-stretch rounded-3xl border border-white/10 bg-white/5 p-[1.5px] shadow-xl shadow-black/30 backdrop-blur-md sm:max-w-[340px]">
            <div className="rounded-3xl bg-[#14234b] px-6 pt-6 pb-4 lg:min-h-[540px] lg:px-8 lg:pt-8 lg:pb-5">
              <div className="flex h-full flex-col justify-center">
                <div>
                  <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-white/65">
                    How it works
                  </p>
                </div>
                <div>
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-white">
                      Tell us your dates
                    </p>
                    <p className="mt-1 text-xs text-white/65">Takes about 60 seconds</p>
                  </div>
                  <div className="mt-4 border-t border-white/8 pt-4">
                    <p className="text-sm font-semibold text-white">We match you with verified owners</p>
                    <p className="mt-1 text-xs text-white/65">Typically within hours</p>
                  </div>
                  <div className="mt-4 border-t border-white/8 pt-4">
                    <p className="text-sm font-semibold text-white">Review and confirm your stay</p>
                    <p className="mt-1 text-xs text-white/65">No surprises, fully protected</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                    <p className="text-sm font-medium text-white/80">
                      Guests typically save $1,200 per stay
                    </p>
                    <p className="mt-2 text-sm font-medium text-white/75">
                      Most matches happen within 6–24 hours
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-center text-[12px] text-white/62">
                  The same villas, the same experience, for a fraction of the cost.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

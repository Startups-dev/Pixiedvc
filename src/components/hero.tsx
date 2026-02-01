import Image from "next/image";
import Link from "next/link";

import { Button } from "@pixiedvc/design-system";
import ReferralLink from "@/components/referral/ReferralLink";

export async function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/castle-hero.png"
          alt="Cinderella Castle with monorail at dusk"
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
          <div className="flex max-w-[620px] flex-col lg:min-h-[520px]">
            <div>
              <span className="relative -top-[35px] inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
                Luxury Disney resorts, smarter pricing, zero hassle.
              </span>
              <h2 className="mt-2 max-w-[15ch] font-display !text-[50px] !leading-[1.05] !font-semibold !text-white drop-shadow-[0_6px_20px_rgba(12,15,44,0.3)] sm:!text-[52px] lg:!text-[56px]">
                Luxury Disney resorts, without the complexity.
              </h2>
            </div>
            <p
              className="mt-6 max-w-md font-sans !text-white/70"
              style={{ fontSize: "13px", lineHeight: "1.7" }}
            >
              A concierge-led, faster way to book Disney Vacation Club villas.
            </p>
            <div className="mt-8">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <span className="dust-trail" aria-hidden="true" />
                  <Button
                    asChild
                  className="bg-white/6 px-5 py-2 text-white !text-white shadow-[0_6px_16px_rgba(35,53,107,0.18)] transition duration-300 hover:bg-white/14"
                >
                    <ReferralLink href="/plan" className="text-white">
                      Check My Dates →
                    </ReferralLink>
                  </Button>
                </div>
              </div>
              <p className="mt-[35px] text-xs uppercase tracking-[0.2em] text-white/70">
                ✔ Verified owners • Secure payments • Concierge-led
              </p>
            </div>
          </div>

          <div className="w-full max-w-[320px] self-stretch rounded-3xl border border-white/12 bg-white/8 p-[1.5px] shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-md sm:max-w-[340px]">
            <div className="rounded-3xl bg-[#14234b] p-6 lg:min-h-[540px] lg:p-8">
              <div className="flex h-full flex-col">
                <div>
                  <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-white/65">
                    What Happens After You Check Your Dates
                  </p>
                </div>
                <div>
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-white">
                      Share your dates & resort preferences
                    </p>
                    <p className="mt-1 text-xs text-white/65">Takes about 60 seconds</p>
                  </div>
                  <div className="mt-4 border-t border-white/8 pt-4">
                    <p className="text-sm font-semibold text-white">We match you with verified owners</p>
                    <p className="mt-1 text-xs text-white/65">Typical match time: 6–24 hours</p>
                  </div>
                  <div className="mt-4 border-t border-white/8 pt-4">
                    <p className="text-sm font-semibold text-white">Review your villa & confirm</p>
                    <p className="mt-1 text-xs text-white/65">Secure, clear, concierge-led</p>
                  </div>
                </div>
                <div className="mt-8">
                  <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
                    Why PixieDVC Works
                  </p>
                  <div className="mt-3 space-y-2 pl-3 text-[11px] text-white/70">
                    <p>• Owners are pre-verified before matching</p>
                    <p>• Pricing is transparent before you commit</p>
                    <p>• You approve the match before anything is booked</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-white/50">You stay in control at every step.</p>
                <div className="mt-8 flex justify-center">
                  <Button
                    asChild
                    className="w-fit rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white !text-white hover:bg-white/20"
                  >
                    <Link href="/plan" className="text-white">
                      Start My Match →
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

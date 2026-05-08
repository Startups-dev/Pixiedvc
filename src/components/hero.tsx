import Link from "next/link";
import Image from "next/image";

import HeroSearchBar from "@/components/HeroSearchBar";
import { getCanonicalResorts } from "@/lib/resorts/getResorts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function Hero() {
  const heroImageSrc = "/images/hero-new.png";
  const heroImageAlt = heroImageSrc.includes("castle")
    ? "Cinderella Castle with monorail at dusk"
    : "PixieDVC resort hero image";
  const supabase = await createSupabaseServerClient();
  const resorts = await getCanonicalResorts(supabase, { select: "id,name,slug" }).catch(() => []);

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
              <span className="inline-block rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/85 backdrop-blur-sm">
                THE DISNEY HACK YOU&apos;VE BEEN LOOKING FOR
              </span>
              <h2 className="mt-2 max-w-[24ch] lg:max-w-[760px] font-display !text-[50px] !leading-[1.03] !font-bold !text-white drop-shadow-[0_6px_20px_rgba(12,15,44,0.3)] sm:!text-[52px] lg:!text-[56px]">
                <span className="block lg:whitespace-nowrap">Disney Deluxe Resorts</span>
                <span className="block lg:whitespace-nowrap">for 50% Less</span>
              </h2>
            </div>
            <p
              className="mt-5 max-w-xl font-sans !text-white/70"
              style={{ fontSize: "14px", lineHeight: "1.75" }}
            >
              Access the same Disney villas for a fraction of the price. We match you with verified owners and handle the
              entire booking for you.
            </p>
            <div className="mt-4">
              <HeroSearchBar resorts={resorts} />
              <div className="mt-2 inline-flex max-w-[440px] self-start rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 shadow-sm backdrop-blur-md">
                <p className="text-[13px] text-white/80">
                  No account needed to start —{" "}
                  <Link
                    href="/login?next=/plan"
                    className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-2.5 py-0.5 font-medium text-white transition hover:bg-white/15"
                  >
                    Sign in
                  </Link>{" "}
                  anytime.
                </p>
              </div>
              <div className="mt-3 inline-flex items-center gap-x-12 text-[11px] tracking-[0.08em] text-white">
                <span className="inline-flex items-center">
                  <span className="mr-2 text-[10px] text-green-300">✔</span>
                  Verified owners
                </span>
                <span>•</span>
                <span>Secure payments</span>
                <span>•</span>
                <span>Concierge support</span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[320px] self-stretch rounded-3xl border border-white/7 bg-white/[0.035] p-[1.5px] shadow-lg shadow-black/20 backdrop-blur-md sm:max-w-[340px]">
            <div className="rounded-3xl bg-[rgba(20,35,75,0.84)] px-6 pt-6 pb-4 lg:min-h-[540px] lg:px-8 lg:pt-8 lg:pb-5">
              <div className="flex h-full flex-col justify-center">
                <div>
                  <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-white/58">
                    How it works
                  </p>
                </div>
                <div>
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-white/92">
                      Tell us your dates
                    </p>
                    <p className="mt-1 text-xs text-white/58">Takes about 60 seconds</p>
                  </div>
                  <div className="mt-4 border-t border-white/6 pt-4">
                    <p className="text-sm font-semibold text-white/92">We match you with verified owners</p>
                    <p className="mt-1 text-xs text-white/58">Typically within hours</p>
                  </div>
                  <div className="mt-4 border-t border-white/6 pt-4">
                    <p className="text-sm font-semibold text-white/92">Review and confirm your stay</p>
                    <p className="mt-1 text-xs text-white/58">No surprises, fully protected</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="rounded-2xl border border-white/7 bg-white/[0.04] px-4 py-3 text-center">
                    <p className="text-sm font-medium text-white/74">
                      Guests typically save $1,200 per stay
                    </p>
                    <p className="mt-2 text-sm font-medium text-white/70">
                      Most matches happen within 6–24 hours
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-center text-[12px] text-white/56">
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

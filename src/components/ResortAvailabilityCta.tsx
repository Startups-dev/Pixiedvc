"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useReferral } from "@/hooks/useReferral";
import { appendRefToUrl } from "@/lib/referral";
import PrimaryCtaLink from "@/components/ui/PrimaryCtaLink";

type Props = {
  slug: string;
  name: string;
};

export default function ResortAvailabilityCta({ slug, name }: Props) {
  const { ref } = useReferral();
  const href = appendRefToUrl(`/plan?resort=${encodeURIComponent(slug)}`, ref);

  return (
    <section className="mx-auto max-w-6xl px-6 pb-12">
      <div
        data-cta-card
        className="rounded-[28px] bg-[#0F2148] px-8 py-12 text-white shadow-[0_24px_70px_rgba(8,12,30,0.25)] sm:px-12 md:py-14"
      >
        <div data-cta-grid className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_auto] md:items-stretch">
          <div className="flex flex-col">
            <div className="space-y-4">
              <div className="text-[18px] tracking-[0.24em] text-white/60">MATCHING</div>
              <div className="space-y-5">
                <h3 className="text-2xl font-semibold tracking-tight !text-white sm:text-3xl">
                  Get Matched to Your Perfect Disney Stay
                </h3>
                <p className="max-w-[60ch] text-sm leading-6 text-slate-400">
                  Tell us your dates and preferences, our concierge system finds and secures the best available DVC
                  reservation for you.
                </p>
              </div>
            </div>
            <p className="mt-6">
              <span className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm text-white/75">
                Fast • Personalized • Effortless
              </span>
            </p>
          </div>
          <div data-cta-button className="pt-1 md:self-center md:pl-6">
            <PrimaryCtaLink href={href} className="!h-auto px-6 py-3.5">
              Start Matching
              <ChevronRight className="h-4 w-4" />
            </PrimaryCtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}

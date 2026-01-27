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
        className="rounded-[28px] bg-[#0F2148] px-8 text-white shadow-[0_24px_70px_rgba(8,12,30,0.25)] sm:px-12"
        style={{ paddingTop: "20px", paddingBottom: "20px" }}
      >
        <div data-cta-grid className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-2.5 text-[11px] tracking-[0.24em] text-white/60">AVAILABILITY</div>
            <h3 className="mb-3.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Plan your stay at {name}
            </h3>
            <p className="max-w-[60ch] text-sm leading-6 text-white/75">
              Concierge-grade matching finds the best point combinations across PixieDVC inventory. Share your dates and vibe,
              and we will send tailored options within 24 hours.
            </p>
          </div>
          <div data-cta-button className="mt-5 md:mt-0 md:justify-self-end md:pl-6">
            <PrimaryCtaLink href={href}>
              Check availability
              <ChevronRight className="h-4 w-4" />
            </PrimaryCtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}

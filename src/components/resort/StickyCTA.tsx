"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useReferral } from "@/hooks/useReferral";
import { appendRefToUrl } from "@/lib/referral";

type Props = {
  resortName: string;
  resortSlug?: string;
};

export default function StickyCTA({ resortName, resortSlug }: Props) {
  const [visible, setVisible] = useState(false);
  const { ref } = useReferral();
  const baseHref = resortSlug ? `/plan?resort=${encodeURIComponent(resortSlug)}` : "/plan";
  const href = appendRefToUrl(baseHref, ref);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 360);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-[60] hidden -translate-x-1/2 sm:block">
      <div className="flex items-center gap-4 rounded-full bg-[#0F2148] px-5 py-3 text-white shadow-xl ring-1 ring-white/10">
        <span className="text-sm md:text-base">
          Ready to stay at <strong className="!text-white">{resortName}</strong>?
        </span>
        <Link
          href={href}
          className="rounded-full bg-gradient-to-r from-[#d9a64f] to-[#f6e58d] px-4 py-1.5 text-sm font-semibold tracking-[0.01em] !text-[#0F2148] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          style={{ color: "#0F2148" }}
        >
          View Availability
        </Link>
      </div>
    </div>
  );
}

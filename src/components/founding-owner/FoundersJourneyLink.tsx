"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import ReferralLink from "@/components/referral/ReferralLink";

const trackingKeys = ["ref", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

export default function FoundersJourneyLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const url = new URL(href, "https://hannadvc.com");
  for (const key of trackingKeys) {
    const value = searchParams.get(key);
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return <ReferralLink href={`${url.pathname}${url.search}`} className={className}>{children}</ReferralLink>;
}

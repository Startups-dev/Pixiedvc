"use client";

import type { ReactNode } from "react";
import Link, { type LinkProps } from "next/link";

import { useReferral } from "@/hooks/useReferral";
import { withRef } from "@/lib/referral";

type ReferralLinkProps = LinkProps & {
  className?: string;
  children: ReactNode;
};

export default function ReferralLink({ href, className, children, ...rest }: ReferralLinkProps) {
  const { ref } = useReferral();
  const hrefValue = typeof href === "string" ? withRef(href, ref) : href;

  return (
    <Link href={hrefValue} className={className} {...rest}>
      {children}
    </Link>
  );
}

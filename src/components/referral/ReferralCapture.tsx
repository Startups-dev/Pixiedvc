"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getRefFromUrl, isValidReferral, setReferral } from "@/lib/referral";

export default function ReferralCapture() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const ref = getRefFromUrl(searchParams);
    if (!ref || !isValidReferral(ref)) {
      return;
    }
    setReferral(ref, pathname);
  }, [searchParams, pathname]);

  return null;
}

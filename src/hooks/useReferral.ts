"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getRefFromUrl, getReferral, isValidReferral } from "@/lib/referral";

export function useReferral() {
  const searchParams = useSearchParams();
  const [ref, setRef] = useState<string | null>(() => getReferral());

  useEffect(() => {
    const fromUrl = getRefFromUrl(searchParams);
    const next = getReferral() ?? (isValidReferral(fromUrl) ? fromUrl : null);
    if (next !== ref) {
      setRef(next);
    }
  }, [ref, searchParams]);

  return { ref };
}

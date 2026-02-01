"use client";

import { useEffect, useState } from "react";

import { getRefFromUrl, getReferral, isValidReferral } from "@/lib/referral";

export function useReferral() {
  const [ref, setRef] = useState<string | null>(() => getReferral());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = getRefFromUrl(new URLSearchParams(window.location.search));
    const next = getReferral() ?? (isValidReferral(fromUrl) ? fromUrl : null);
    if (next !== ref) {
      setRef(next);
    }
  }, [ref]);

  return { ref };
}

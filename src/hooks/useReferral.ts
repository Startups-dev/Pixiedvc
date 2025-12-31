"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { getRefFromUrl, persistRef, readPersistedRef } from "@/lib/referral";

export function useReferral() {
  const searchParams = useSearchParams();
  const refFromUrl = useMemo(() => getRefFromUrl(searchParams), [searchParams]);
  const persisted = useMemo(() => readPersistedRef(), []);
  const ref = refFromUrl ?? persisted;

  useEffect(() => {
    if (refFromUrl) {
      persistRef(refFromUrl);
    }
  }, [refFromUrl]);

  return { ref };
}

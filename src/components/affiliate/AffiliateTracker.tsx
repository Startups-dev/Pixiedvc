"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function AffiliateTracker() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref || ref === lastRef.current) {
      return;
    }
    lastRef.current = ref;
    const storageKey = `px_aff_click_${ref}`;
    const clickId =
      sessionStorage.getItem(storageKey) ??
      (() => {
        const id = crypto.randomUUID();
        sessionStorage.setItem(storageKey, id);
        return id;
      })();

    fetch("/api/affiliates/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref, path: pathname, click_id: clickId }),
    }).catch(() => undefined);
  }, [searchParams, pathname]);

  return null;
}

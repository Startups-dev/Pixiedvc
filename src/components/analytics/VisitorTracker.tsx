"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getUtmParams,
  shouldTrackPath,
} from "@/lib/analytics/shared";
import { dispatchAnalytics, getOrCreateAnalyticsIdentity } from "@/lib/analytics/client";

export default function VisitorTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || !shouldTrackPath(pathname)) {
      return;
    }

    const search = searchParams.toString();
    const routeKey = `${pathname}?${search}`;
    if (lastTrackedKeyRef.current === routeKey) {
      return;
    }
    lastTrackedKeyRef.current = routeKey;

    const { visitorId, sessionId } = getOrCreateAnalyticsIdentity();
    const utm = getUtmParams(searchParams);
    const payload = JSON.stringify({
      visitorId,
      sessionId,
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      ...utm,
    });

    dispatchAnalytics("/api/analytics/pageview", payload);
  }, [pathname, searchParams]);

  return null;
}

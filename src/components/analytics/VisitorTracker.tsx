"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ANALYTICS_LAST_ACTIVITY_KEY,
  ANALYTICS_SESSION_ID_KEY,
  ANALYTICS_SESSION_TIMEOUT_MS,
  ANALYTICS_VISITOR_ID_KEY,
  getUtmParams,
  shouldTrackPath,
} from "@/lib/analytics/shared";

function getOrCreateVisitorId() {
  const existing = localStorage.getItem(ANALYTICS_VISITOR_ID_KEY);
  if (existing) return existing;
  const nextId = crypto.randomUUID();
  localStorage.setItem(ANALYTICS_VISITOR_ID_KEY, nextId);
  return nextId;
}

function getOrCreateSessionId(now: number) {
  const existing = sessionStorage.getItem(ANALYTICS_SESSION_ID_KEY);
  const lastActivity = Number(sessionStorage.getItem(ANALYTICS_LAST_ACTIVITY_KEY) ?? "0");

  if (existing && now - lastActivity < ANALYTICS_SESSION_TIMEOUT_MS) {
    sessionStorage.setItem(ANALYTICS_LAST_ACTIVITY_KEY, String(now));
    return existing;
  }

  const nextId = crypto.randomUUID();
  sessionStorage.setItem(ANALYTICS_SESSION_ID_KEY, nextId);
  sessionStorage.setItem(ANALYTICS_LAST_ACTIVITY_KEY, String(now));
  return nextId;
}

function dispatchAnalytics(url: string, payload: string) {
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], { type: "application/json" });
    const queued = navigator.sendBeacon(url, blob);
    if (queued) return;
  }

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

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

    const now = Date.now();
    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId(now);
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

"use client";

import {
  ANALYTICS_LAST_ACTIVITY_KEY,
  ANALYTICS_SESSION_ID_KEY,
  ANALYTICS_SESSION_TIMEOUT_MS,
  ANALYTICS_VISITOR_ID_KEY,
} from "@/lib/analytics/shared";

export function getOrCreateVisitorId() {
  const existing = localStorage.getItem(ANALYTICS_VISITOR_ID_KEY);
  if (existing) return existing;

  const nextId = crypto.randomUUID();
  localStorage.setItem(ANALYTICS_VISITOR_ID_KEY, nextId);
  return nextId;
}

export function getOrCreateSessionId(now: number) {
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

export function getOrCreateAnalyticsIdentity(now = Date.now()) {
  return {
    visitorId: getOrCreateVisitorId(),
    sessionId: getOrCreateSessionId(now),
  };
}

export function dispatchAnalytics(url: string, payload: string) {
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

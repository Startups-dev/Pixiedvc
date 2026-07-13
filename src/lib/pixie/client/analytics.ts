"use client";

import { dispatchAnalytics, getOrCreateAnalyticsIdentity } from "@/lib/analytics/client";
import { getUtmParams } from "@/lib/analytics/shared";

export type PixieAnalyticsEventName =
  | "pixie_page_viewed"
  | "pixie_planning_started"
  | "pixie_first_message_sent"
  | "pixie_turn_completed"
  | "pixie_turn_failed"
  | "pixie_profile_progressed"
  | "pixie_resort_recommendations_shown"
  | "pixie_ready_stay_matches_shown"
  | "pixie_ready_stay_clicked"
  | "pixie_save_prompt_shown"
  | "pixie_login_clicked"
  | "pixie_trip_reset";

type SafeProperties = Record<string, string | number | boolean | null>;

export function trackPixieEvent(eventName: PixieAnalyticsEventName, properties: SafeProperties = {}) {
  if (typeof window === "undefined") return;
  try {
    const identity = getOrCreateAnalyticsIdentity();
    const searchParams = new URLSearchParams(window.location.search);
    const payload = JSON.stringify({
      ...identity,
      ...getUtmParams(searchParams),
      eventName,
      pagePath: window.location.pathname,
      properties,
    });
    dispatchAnalytics("/api/analytics/event", payload);
  } catch {
    // Analytics must never block planning.
  }
}


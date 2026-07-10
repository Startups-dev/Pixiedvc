import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isUserAdmin } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service-client";
import {
  getBrowser,
  getDeviceType,
  sanitizeAnalyticsEventPayload,
  sanitizeAnalyticsPageviewPayload,
  sanitizeReferrer,
  shouldTrackPath,
} from "@/lib/analytics/shared";

type SessionInsert = {
  visitor_id: string;
  session_id: string;
  started_at: string;
  first_seen_at: string;
  last_seen_at: string;
  session_duration_seconds: number;
  landing_page_path: string;
  exit_page_path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  device_type: string;
  browser: string;
  country: string | null;
  city: string | null;
};

type OverviewMetric = {
  visitorsToday: number;
  visitorsWeek: number;
  visitorsMonth: number;
  pageviewsToday: number;
  pageviewsWeek: number;
  pageviewsMonth: number;
  averageSessionDurationSeconds: number;
};

type OverviewTopRow = {
  label: string;
  count: number;
};

export type AnalyticsOverview = {
  metrics: OverviewMetric;
  topPages: OverviewTopRow[];
  topReferrers: OverviewTopRow[];
  topUtmSources: OverviewTopRow[];
  recentSessions: Array<{
    id: string;
    visitorId: string;
    sessionId: string;
    startedAt: string;
    lastSeenAt: string;
    sessionDurationSeconds: number;
    landingPagePath: string;
    exitPagePath: string;
    referrer: string | null;
    utmSource: string | null;
    deviceType: string;
    browser: string;
    country: string | null;
    city: string | null;
  }>;
};

const ANALYTICS_TIME_ZONE = process.env.APP_TIMEZONE || "America/New_York";

function getTimeZoneDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = getPart("hour");

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: hour === 24 ? 0 : hour,
    minute: getPart("minute"),
    second: getPart("second"),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneDateParts(date, timeZone);
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return localAsUtc - date.getTime();
}

function zonedLocalTimeToUtc(
  timeZone: string,
  input: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
) {
  const utcGuess = new Date(
    Date.UTC(input.year, input.month - 1, input.day, input.hour ?? 0, input.minute ?? 0, input.second ?? 0),
  );
  return new Date(utcGuess.getTime() - getTimeZoneOffsetMs(utcGuess, timeZone));
}

function startOfDay(date: Date, timeZone = ANALYTICS_TIME_ZONE) {
  const parts = getTimeZoneDateParts(date, timeZone);
  return zonedLocalTimeToUtc(timeZone, {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  });
}

function startOfMonth(date: Date, timeZone = ANALYTICS_TIME_ZONE) {
  const parts = getTimeZoneDateParts(date, timeZone);
  return zonedLocalTimeToUtc(timeZone, {
    year: parts.year,
    month: parts.month,
    day: 1,
  });
}

function startOfTrailingDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function extractLocation(headers: Headers) {
  const country =
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    headers.get("x-country-code");
  const city = headers.get("x-vercel-ip-city") ?? headers.get("x-city");

  return {
    country: country?.trim() ? country.trim().slice(0, 120) : null,
    city: city?.trim() ? city.trim().slice(0, 120) : null,
  };
}

async function shouldSkipForAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return isUserAdmin({
    profileRole: profile?.role ?? null,
    appRole: (user.app_metadata?.role as string | undefined) ?? null,
    email: user.email ?? null,
  });
}

async function getAnalyticsWriter() {
  const adminClient = getSupabaseAdminClient();
  if (adminClient) return adminClient;
  return createServiceClient();
}

async function findOrCreateSession(input: {
  visitorId: string;
  sessionId: string;
  path: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  headers: Headers;
}) {
  const client = await getAnalyticsWriter();
  const nowIso = new Date().toISOString();
  const userAgent = input.headers.get("user-agent");
  const host = input.headers.get("host");
  const safeReferrer = sanitizeReferrer(input.referrer, host);
  const { country, city } = extractLocation(input.headers);

  const { data: existing, error: lookupError } = await client
    .from("visitor_sessions")
    .select("id, started_at, referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content")
    .eq("session_id", input.sessionId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (!existing) {
    const session: SessionInsert = {
      visitor_id: input.visitorId,
      session_id: input.sessionId,
      started_at: nowIso,
      first_seen_at: nowIso,
      last_seen_at: nowIso,
      session_duration_seconds: 0,
      landing_page_path: input.path,
      exit_page_path: input.path,
      referrer: safeReferrer,
      utm_source: input.utmSource,
      utm_medium: input.utmMedium,
      utm_campaign: input.utmCampaign,
      utm_term: input.utmTerm,
      utm_content: input.utmContent,
      device_type: getDeviceType(userAgent),
      browser: getBrowser(userAgent),
      country,
      city,
    };

    const { data: created, error: insertError } = await client
      .from("visitor_sessions")
      .insert({
        ...session,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id, started_at")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return created;
  }

  const startedAt = new Date(existing.started_at);
  const durationSeconds = Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 1000));
  const { data: updated, error: updateError } = await client
    .from("visitor_sessions")
    .update({
      last_seen_at: nowIso,
      session_duration_seconds: durationSeconds,
      exit_page_path: input.path,
      referrer: existing.referrer ?? safeReferrer,
      utm_source: existing.utm_source ?? input.utmSource,
      utm_medium: existing.utm_medium ?? input.utmMedium,
      utm_campaign: existing.utm_campaign ?? input.utmCampaign,
      utm_term: existing.utm_term ?? input.utmTerm,
      utm_content: existing.utm_content ?? input.utmContent,
      updated_at: nowIso,
    })
    .eq("id", existing.id)
    .select("id, started_at")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return updated;
}

export async function ensureAnalyticsSession(input: {
  visitorId: string;
  sessionId: string;
  path: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  headers: Headers;
}) {
  return findOrCreateSession(input);
}

export async function recordPageview(request: Request) {
  const payload = sanitizeAnalyticsPageviewPayload(await request.json().catch(() => null));
  if (!payload || !shouldTrackPath(payload.path)) {
    return { ok: true, skipped: true as const };
  }

  if (await shouldSkipForAdminUser()) {
    return { ok: true, skipped: true as const };
  }

  const client = await getAnalyticsWriter();
  const session = await findOrCreateSession({
    visitorId: payload.visitorId,
    sessionId: payload.sessionId,
    path: payload.path,
    referrer: payload.referrer,
    utmSource: payload.utmSource,
    utmMedium: payload.utmMedium,
    utmCampaign: payload.utmCampaign,
    utmTerm: payload.utmTerm,
    utmContent: payload.utmContent,
    headers: request.headers,
  });

  const { error } = await client.from("visitor_pageviews").insert({
    session_row_id: session.id,
    visitor_id: payload.visitorId,
    session_id: payload.sessionId,
    page_path: payload.path,
    referrer: sanitizeReferrer(payload.referrer, request.headers.get("host")),
    utm_source: payload.utmSource,
    utm_medium: payload.utmMedium,
    utm_campaign: payload.utmCampaign,
    utm_term: payload.utmTerm,
    utm_content: payload.utmContent,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true, skipped: false as const };
}

export async function recordEvent(request: Request) {
  const payload = sanitizeAnalyticsEventPayload(await request.json().catch(() => null));
  if (!payload || (payload.pagePath && !shouldTrackPath(payload.pagePath))) {
    return { ok: true, skipped: true as const };
  }

  if (await shouldSkipForAdminUser()) {
    return { ok: true, skipped: true as const };
  }

  const client = await getAnalyticsWriter();
  const session = await findOrCreateSession({
    visitorId: payload.visitorId,
    sessionId: payload.sessionId,
    path: payload.pagePath ?? "/",
    referrer: null,
    utmSource: payload.utmSource,
    utmMedium: payload.utmMedium,
    utmCampaign: payload.utmCampaign,
    utmTerm: payload.utmTerm,
    utmContent: payload.utmContent,
    headers: request.headers,
  });

  const { error } = await client.from("visitor_events").insert({
    session_row_id: session.id,
    visitor_id: payload.visitorId,
    session_id: payload.sessionId,
    event_name: payload.eventName,
    page_path: payload.pagePath,
    properties: payload.properties ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true, skipped: false as const };
}

async function countDistinctVisitorsSince(client: Awaited<ReturnType<typeof getAnalyticsWriter>>, sinceIso: string) {
  const { data, error } = await client
    .from("visitor_sessions")
    .select("visitor_id")
    .gte("last_seen_at", sinceIso);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data ?? []).map((row) => row.visitor_id)).size;
}

async function countPageviewsSince(client: Awaited<ReturnType<typeof getAnalyticsWriter>>, sinceIso: string) {
  const { count, error } = await client
    .from("visitor_pageviews")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getAnalyticsOverview() {
  const client = await getAnalyticsWriter();
  const now = new Date();
  const todayIso = startOfDay(now).toISOString();
  const trailingSevenDaysIso = startOfTrailingDays(now, 7).toISOString();
  const monthIso = startOfMonth(now).toISOString();
  const avgWindowIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    visitorsToday,
    visitorsWeek,
    visitorsMonth,
    pageviewsToday,
    pageviewsWeek,
    pageviewsMonth,
    sessionDurationRows,
    pageRows,
    referrerRows,
    utmRows,
    recentSessionRows,
  ] = await Promise.all([
    countDistinctVisitorsSince(client, todayIso),
    countDistinctVisitorsSince(client, trailingSevenDaysIso),
    countDistinctVisitorsSince(client, monthIso),
    countPageviewsSince(client, todayIso),
    countPageviewsSince(client, trailingSevenDaysIso),
    countPageviewsSince(client, monthIso),
    client
      .from("visitor_sessions")
      .select("session_duration_seconds")
      .gte("last_seen_at", avgWindowIso),
    client
      .from("visitor_pageviews")
      .select("page_path")
      .gte("created_at", monthIso)
      .order("created_at", { ascending: false })
      .limit(5000),
    client
      .from("visitor_sessions")
      .select("referrer")
      .gte("started_at", monthIso)
      .not("referrer", "is", null)
      .order("started_at", { ascending: false })
      .limit(5000),
    client
      .from("visitor_sessions")
      .select("utm_source")
      .gte("started_at", monthIso)
      .not("utm_source", "is", null)
      .order("started_at", { ascending: false })
      .limit(5000),
    client
      .from("visitor_sessions")
      .select(
        "id, visitor_id, session_id, started_at, last_seen_at, session_duration_seconds, landing_page_path, exit_page_path, referrer, utm_source, device_type, browser, country, city",
      )
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  if (sessionDurationRows.error) throw new Error(sessionDurationRows.error.message);
  if (pageRows.error) throw new Error(pageRows.error.message);
  if (referrerRows.error) throw new Error(referrerRows.error.message);
  if (utmRows.error) throw new Error(utmRows.error.message);
  if (recentSessionRows.error) throw new Error(recentSessionRows.error.message);

  const averageSessionDurationSeconds = (() => {
    const rows = sessionDurationRows.data ?? [];
    if (rows.length === 0) return 0;
    const total = rows.reduce((sum, row) => sum + (row.session_duration_seconds ?? 0), 0);
    return Math.round(total / rows.length);
  })();

  const summarize = (values: Array<string | null | undefined>) =>
    Array.from(
      values.reduce((map, value) => {
        if (!value) return map;
        map.set(value, (map.get(value) ?? 0) + 1);
        return map;
      }, new Map<string, number>()),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, count]) => ({ label, count }));

  const overview: AnalyticsOverview = {
    metrics: {
      visitorsToday,
      visitorsWeek,
      visitorsMonth,
      pageviewsToday,
      pageviewsWeek,
      pageviewsMonth,
      averageSessionDurationSeconds,
    },
    topPages: summarize((pageRows.data ?? []).map((row) => row.page_path)),
    topReferrers: summarize((referrerRows.data ?? []).map((row) => row.referrer)),
    topUtmSources: summarize((utmRows.data ?? []).map((row) => row.utm_source)),
    recentSessions: (recentSessionRows.data ?? []).map((row) => ({
      id: row.id,
      visitorId: row.visitor_id,
      sessionId: row.session_id,
      startedAt: row.started_at,
      lastSeenAt: row.last_seen_at,
      sessionDurationSeconds: row.session_duration_seconds ?? 0,
      landingPagePath: row.landing_page_path,
      exitPagePath: row.exit_page_path,
      referrer: row.referrer,
      utmSource: row.utm_source,
      deviceType: row.device_type ?? "unknown",
      browser: row.browser ?? "unknown",
      country: row.country,
      city: row.city,
    })),
  };

  return overview;
}

export const ANALYTICS_VISITOR_ID_KEY = "px_visitor_id";
export const ANALYTICS_SESSION_ID_KEY = "px_session_id";
export const ANALYTICS_LAST_ACTIVITY_KEY = "px_session_last_activity";
export const ANALYTICS_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const PRIVATE_PATH_PREFIXES = [
  "/admin",
  "/owner",
  "/affiliate",
  "/profile",
  "/my-trip",
  "/guest",
  "/requests",
  "/pay",
  "/receipt",
  "/contracts",
  "/onboarding",
  "/login",
  "/auth",
  "/test",
];

type NullableStringRecord = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
};

export type AnalyticsPageviewPayload = NullableStringRecord & {
  visitorId: string;
  sessionId: string;
  path: string;
  referrer: string | null;
};

export type AnalyticsEventPayload = NullableStringRecord & {
  visitorId: string;
  sessionId: string;
  eventName: string;
  pagePath: string | null;
  properties?: Record<string, string | number | boolean | null> | null;
};

function clamp(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function sanitizePath(input: string | null | undefined) {
  if (!input) return null;

  try {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      const url = new URL(input);
      return clamp(url.pathname || "/", 512);
    }
  } catch {
    return null;
  }

  const basePath = input.split("?")[0]?.split("#")[0] ?? "/";
  if (!basePath.startsWith("/")) return null;
  return clamp(basePath || "/", 512);
}

export function shouldTrackPath(path: string | null | undefined) {
  const normalizedPath = sanitizePath(path);
  if (!normalizedPath) return false;
  return !PRIVATE_PATH_PREFIXES.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`));
}

export function sanitizeReferrer(input: string | null | undefined, host?: string | null) {
  if (!input) return null;

  try {
    const url = new URL(input);
    if (host && url.host === host) {
      return null;
    }
    return clamp(`${url.origin}${url.pathname}`, 1024);
  } catch {
    return null;
  }
}

export function getBrowser(userAgent: string | null | undefined) {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return "unknown";
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "opera";
  if (ua.includes("firefox/")) return "firefox";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "chrome";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "safari";
  if (ua.includes("msie") || ua.includes("trident/")) return "ie";
  return "unknown";
}

export function getDeviceType(userAgent: string | null | undefined) {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return "unknown";
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobi|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}

export function getUtmParams(searchParams: URLSearchParams): NullableStringRecord {
  return {
    utmSource: clamp(searchParams.get("utm_source") ?? "", 255),
    utmMedium: clamp(searchParams.get("utm_medium") ?? "", 255),
    utmCampaign: clamp(searchParams.get("utm_campaign") ?? "", 255),
    utmTerm: clamp(searchParams.get("utm_term") ?? "", 255),
    utmContent: clamp(searchParams.get("utm_content") ?? "", 255),
  };
}

export function sanitizeAnalyticsPageviewPayload(input: unknown): AnalyticsPageviewPayload | null {
  if (!input || typeof input !== "object") return null;
  const payload = input as Record<string, unknown>;
  const path = sanitizePath(typeof payload.path === "string" ? payload.path : null);
  if (!path || !shouldTrackPath(path)) return null;

  const visitorId = clamp(typeof payload.visitorId === "string" ? payload.visitorId : "", 128);
  const sessionId = clamp(typeof payload.sessionId === "string" ? payload.sessionId : "", 128);
  if (!visitorId || !sessionId) return null;

  return {
    visitorId,
    sessionId,
    path,
    referrer: sanitizeReferrer(typeof payload.referrer === "string" ? payload.referrer : null),
    utmSource: clamp(typeof payload.utmSource === "string" ? payload.utmSource : "", 255),
    utmMedium: clamp(typeof payload.utmMedium === "string" ? payload.utmMedium : "", 255),
    utmCampaign: clamp(typeof payload.utmCampaign === "string" ? payload.utmCampaign : "", 255),
    utmTerm: clamp(typeof payload.utmTerm === "string" ? payload.utmTerm : "", 255),
    utmContent: clamp(typeof payload.utmContent === "string" ? payload.utmContent : "", 255),
  };
}

export function sanitizeAnalyticsEventPayload(input: unknown): AnalyticsEventPayload | null {
  if (!input || typeof input !== "object") return null;
  const payload = input as Record<string, unknown>;
  const visitorId = clamp(typeof payload.visitorId === "string" ? payload.visitorId : "", 128);
  const sessionId = clamp(typeof payload.sessionId === "string" ? payload.sessionId : "", 128);
  const eventName = clamp(typeof payload.eventName === "string" ? payload.eventName : "", 120);
  if (!visitorId || !sessionId || !eventName) return null;

  const propertiesInput =
    payload.properties && typeof payload.properties === "object" && !Array.isArray(payload.properties)
      ? (payload.properties as Record<string, unknown>)
      : null;
  const properties = propertiesInput
    ? Object.fromEntries(
        Object.entries(propertiesInput)
          .slice(0, 20)
          .flatMap(([key, value]) => {
            const normalizedKey = clamp(key, 64);
            if (!normalizedKey) return [];
            if (
              value === null ||
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
            ) {
              return [[normalizedKey, typeof value === "string" ? value.slice(0, 500) : value]];
            }
            return [];
          }),
      )
    : {};

  const pagePath = sanitizePath(typeof payload.pagePath === "string" ? payload.pagePath : null);

  return {
    visitorId,
    sessionId,
    eventName,
    pagePath,
    properties,
    utmSource: clamp(typeof payload.utmSource === "string" ? payload.utmSource : "", 255),
    utmMedium: clamp(typeof payload.utmMedium === "string" ? payload.utmMedium : "", 255),
    utmCampaign: clamp(typeof payload.utmCampaign === "string" ? payload.utmCampaign : "", 255),
    utmTerm: clamp(typeof payload.utmTerm === "string" ? payload.utmTerm : "", 255),
    utmContent: clamp(typeof payload.utmContent === "string" ? payload.utmContent : "", 255),
  };
}


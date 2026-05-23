const LOCALHOST_URL_RE = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i;

function normalizeBaseUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getAppBaseUrl() {
  const isProduction = process.env.NODE_ENV === "production";
  const appBaseUrl = process.env.APP_BASE_URL;

  if (isProduction && !appBaseUrl) {
    console.warn("[app-url] APP_BASE_URL missing in production. Falling back to NEXT_PUBLIC_SITE_URL/NEXT_PUBLIC_APP_URL.");
  }

  const candidates = [appBaseUrl, process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXT_PUBLIC_APP_URL];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalizeBaseUrl(candidate);
    if (!normalized) continue;
    if (isProduction && LOCALHOST_URL_RE.test(normalized)) {
      console.warn(`[app-url] Ignoring localhost base URL in production: ${normalized}`);
      continue;
    }
    return normalized;
  }

  if (!isProduction) {
    return "http://localhost:3000";
  }

  console.warn("[app-url] Missing valid APP_BASE_URL/NEXT_PUBLIC_SITE_URL/NEXT_PUBLIC_APP_URL in production.");
  return null;
}

export function warnIfUnsafeEmailUrl(url: string | null | undefined, context: string) {
  if (!url || process.env.NODE_ENV !== "production") return;
  if (LOCALHOST_URL_RE.test(url)) {
    console.warn(`[app-url] Unsafe localhost URL detected in production for ${context}: ${url}`);
  }
}

export function getAppUrl(path: string, context = "email link") {
  const baseUrl = getAppBaseUrl();
  if (!baseUrl) return null;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;
  warnIfUnsafeEmailUrl(url, context);
  return url;
}

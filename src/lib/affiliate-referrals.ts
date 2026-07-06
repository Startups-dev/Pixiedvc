const LOCALHOST_URL_RE = /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?$/i;
const PRODUCTION_REFERRAL_BASE_URL = "https://pixiedvc.com";

function normalizeBaseUrl(value: string | null | undefined) {
  if (!value) return "";
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function getReferralBaseUrl(fallbackOrigin?: string | null) {
  const isProduction = process.env.NODE_ENV === "production";
  const appUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (appUrl && !(isProduction && LOCALHOST_URL_RE.test(appUrl))) return appUrl;

  const siteUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (siteUrl && !(isProduction && LOCALHOST_URL_RE.test(siteUrl))) return siteUrl;

  if (isProduction) return PRODUCTION_REFERRAL_BASE_URL;

  const fallback = normalizeBaseUrl(fallbackOrigin);
  if (fallback) return fallback;

  return "";
}

export function getClientReferralBaseUrl() {
  const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : null;
  return getReferralBaseUrl(fallbackOrigin);
}

export function buildAffiliateReferralPath(slug: string, targetPath = "/") {
  const cleanSlug = slug.trim();
  if (!cleanSlug) return "";

  if (!targetPath || targetPath === "/") {
    return `/go/${encodeURIComponent(cleanSlug)}`;
  }

  const safeTarget = targetPath.startsWith("/") ? targetPath : "/";
  return `/go/${encodeURIComponent(cleanSlug)}?to=${encodeURIComponent(safeTarget)}`;
}

export function buildAffiliateReferralUrl(baseUrl: string, slug: string, targetPath = "/") {
  const path = buildAffiliateReferralPath(slug, targetPath);
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  if (!path) return "";
  if (!normalizedBaseUrl) return path;

  return `${normalizedBaseUrl}${path}`;
}

export function isLocalReferralBaseUrl(baseUrl: string) {
  return LOCALHOST_URL_RE.test(baseUrl.replace(/\/$/, ""));
}

export function normalizeAffiliateSlug(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return normalized;
}

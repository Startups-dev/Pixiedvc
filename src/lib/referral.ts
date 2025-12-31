const REF_COOKIE = "pixiedvc_ref";
const REF_SET_AT_COOKIE = "pixiedvc_ref_set_at";
const REF_LANDING_COOKIE = "pixiedvc_ref_landing";
const REF_MAX_AGE_DAYS = 90;
const REF_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;

type SearchParamsLike = URLSearchParams | { get: (key: string) => string | null };

function safeWindow() {
  return typeof window !== "undefined" ? window : null;
}

function getCookieValue(name: string) {
  const win = safeWindow();
  if (!win) return null;
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!raw) return null;
  const value = raw.split("=").slice(1).join("=");
  return decodeURIComponent(value);
}

function setCookie(name: string, value: string) {
  const win = safeWindow();
  if (!win) return;
  const maxAge = REF_MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = win.location.protocol === "https:" || process.env.NODE_ENV === "production";
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; samesite=lax${
    secure ? "; secure" : ""
  }`;
}

export function getRefFromUrl(searchParams?: SearchParamsLike | null) {
  if (!searchParams) return null;
  const ref = searchParams.get("ref");
  return ref && ref.trim() ? ref.trim() : null;
}

export function getReferral() {
  return getCookieValue(REF_COOKIE);
}

export function getReferralMeta() {
  return {
    referral: getCookieValue(REF_COOKIE),
    setAt: getCookieValue(REF_SET_AT_COOKIE),
    landing: getCookieValue(REF_LANDING_COOKIE),
  };
}

export function setReferral(ref: string, landingPath?: string) {
  const existing = getReferral();
  if (existing) {
    return existing;
  }
  if (!REF_REGEX.test(ref)) {
    return null;
  }
  setCookie(REF_COOKIE, ref);
  setCookie(REF_SET_AT_COOKIE, new Date().toISOString());
  if (landingPath) {
    setCookie(REF_LANDING_COOKIE, landingPath);
  }
  return ref;
}

export function appendRefToUrl(url: string, ref: string | null) {
  if (!ref) return url;
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(url, base);
    if (!parsed.searchParams.get("ref")) {
      parsed.searchParams.set("ref", ref);
    }
    const full = parsed.toString();
    if (full.startsWith(base)) {
      return full.replace(base, "");
    }
    return full;
  } catch {
    return url;
  }
}

export function isValidReferral(ref: string | null) {
  if (!ref) return false;
  return REF_REGEX.test(ref);
}

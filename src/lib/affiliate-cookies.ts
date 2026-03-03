import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export const AFFILIATE_COOKIE = "px_aff";
export const AFFILIATE_CLICK_COOKIE = "px_aff_click";
export const AFFILIATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;
const LEGACY_AFFILIATE_COOKIE = "pixiedvc_ref";

export type AffiliateCookiePayload = {
  affiliateRef: string;
  clickId?: string;
};

function getBrowserCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!raw) return null;
  const value = raw.split("=").slice(1).join("=");
  return decodeURIComponent(value);
}

export function getAffiliateRef(cookieStore?: ReadonlyRequestCookies): string | null {
  if (cookieStore) {
    const current = cookieStore.get(AFFILIATE_COOKIE)?.value ?? null;
    if (current) return current;
    return cookieStore.get(LEGACY_AFFILIATE_COOKIE)?.value ?? null;
  }

  const current = getBrowserCookie(AFFILIATE_COOKIE);
  if (current) return current;
  const legacy = getBrowserCookie(LEGACY_AFFILIATE_COOKIE);
  if (legacy) {
    setAffiliateRef(legacy);
    return legacy;
  }
  return null;
}

export function setAffiliateRef(ref: string): string | null {
  if (typeof document === "undefined") return null;
  const normalized = ref.trim();
  if (!normalized) return null;
  const secure = window.location.protocol === "https:" || process.env.NODE_ENV === "production";
  document.cookie = `${AFFILIATE_COOKIE}=${encodeURIComponent(normalized)}; max-age=${AFFILIATE_COOKIE_MAX_AGE}; path=/; samesite=lax${
    secure ? "; secure" : ""
  }`;
  return normalized;
}

export function readAffiliateCookies(cookieStore: ReadonlyRequestCookies): AffiliateCookiePayload | null {
  const affiliateRef = getAffiliateRef(cookieStore);
  if (!affiliateRef) {
    return null;
  }
  const clickId = cookieStore.get(AFFILIATE_CLICK_COOKIE)?.value;
  return { affiliateRef, clickId };
}

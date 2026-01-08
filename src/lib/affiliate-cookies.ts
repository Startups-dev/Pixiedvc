import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export const AFFILIATE_COOKIE = "px_aff";
export const AFFILIATE_CLICK_COOKIE = "px_aff_click";
export const AFFILIATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type AffiliateCookiePayload = {
  affiliateId: string;
  clickId?: string;
};

export function readAffiliateCookies(cookieStore: ReadonlyRequestCookies): AffiliateCookiePayload | null {
  const affiliateId = cookieStore.get(AFFILIATE_COOKIE)?.value;
  if (!affiliateId) {
    return null;
  }
  const clickId = cookieStore.get(AFFILIATE_CLICK_COOKIE)?.value;
  return { affiliateId, clickId };
}

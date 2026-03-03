import { getAffiliateRef, setAffiliateRef } from "@/lib/affiliate-cookies";

const REF_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;

type SearchParamsLike = URLSearchParams | { get: (key: string) => string | null };

export function getRefFromUrl(searchParams?: SearchParamsLike | null) {
  if (!searchParams) return null;
  const ref = searchParams.get("ref");
  return ref && ref.trim() ? ref.trim() : null;
}

export function getReferral() {
  return getAffiliateRef();
}

export function getReferralMeta() {
  return {
    referral: getAffiliateRef(),
    setAt: null,
    landing: null,
  };
}

export function setReferral(ref: string, landingPath?: string) {
  void landingPath;
  const existing = getReferral();
  if (existing) {
    return existing;
  }
  if (!REF_REGEX.test(ref)) {
    return null;
  }
  return setAffiliateRef(ref);
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

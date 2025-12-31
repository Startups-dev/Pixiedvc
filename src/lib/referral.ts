const REF_COOKIE = "pixiedvc_ref";
const REF_MAX_AGE_DAYS = 90;

function safeWindow() {
  return typeof window !== "undefined" ? window : null;
}

export function getRefFromUrl(searchParams?: URLSearchParams | { get: (key: string) => string | null } | null) {
  if (!searchParams) return null;
  const ref = searchParams.get("ref");
  return ref && ref.trim() ? ref.trim() : null;
}

export function persistRef(ref: string) {
  const win = safeWindow();
  if (!win) return;
  const value = encodeURIComponent(ref);
  const maxAge = REF_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${REF_COOKIE}=${value}; max-age=${maxAge}; path=/; samesite=lax`;
}

export function readPersistedRef() {
  const win = safeWindow();
  if (!win) return null;
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${REF_COOKIE}=`));
  if (!raw) return null;
  const value = raw.split("=").slice(1).join("=");
  const decoded = decodeURIComponent(value);
  return decoded.trim() || null;
}

export function withRef(url: string, ref: string | null) {
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

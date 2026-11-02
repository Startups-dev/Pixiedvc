export type AppRole = "guest" | "owner" | "affiliate" | "admin" | null | undefined;

export function getHomeForRole(role: AppRole): string {
  if (role === "affiliate") return "/affiliate/dashboard";
  if (role === "admin") return "/admin";
  if (role === "owner") return "/owner/dashboard";
  if (role === "guest") return "/my-trip";
  return "/onboarding";
}

export type DashboardDestination = {
  id: "admin" | "owner" | "affiliate" | "guest";
  label: string;
  href: string;
};

export type AccountNavigation = {
  label: string;
  dashboards: DashboardDestination[];
  defaultHref: string;
};

export function isPathWithin(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

function hasControlCharacters(value: string) {
  return Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}

/** Only local page URLs. Decode the pathname for permission checks as well. */
export function getSafeReturnPath(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value) || hasControlCharacters(value)) {
    return null;
  }
  try {
    const url = new URL(value, "https://navigation.invalid");
    // Encoded separators and nested encoding are unnecessary for our page routes.
    if (url.origin !== "https://navigation.invalid" || /%(?:2f|5c|25)/i.test(url.pathname)) return null;
    const pathname = decodeURIComponent(url.pathname);
    if (/[\\?#]/.test(pathname) || hasControlCharacters(pathname) || pathname.startsWith("//")) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Navigation filtering only; destination guards still enforce resource access. */
export function getLoginDestination(navigation: AccountNavigation | null, requested?: string | null): string {
  if (!navigation) return "/login";
  const fallback = navigation.defaultHref;
  const safePath = getSafeReturnPath(requested);
  if (!safePath) return fallback;
  const pathname = decodeURIComponent(new URL(safePath, "https://navigation.invalid").pathname);
  const dashboard = (id: DashboardDestination["id"]) => navigation.dashboards.find((item) => item.id === id);

  if (isPathWithin(pathname, "/api") || isPathWithin(pathname, "/auth")) return fallback;
  // The legacy onboarding guard only resolves owner/guest roles. Keep admins out of its loop.
  if (isPathWithin(pathname, "/onboarding") && dashboard("admin")) return fallback;
  if (pathname === "/login") {
    return new URL(safePath, "https://navigation.invalid").searchParams.get("mode") === "update" ? safePath : fallback;
  }
  if (isPathWithin(pathname, "/admin") && !dashboard("admin")) return fallback;
  if (isPathWithin(pathname, "/owner")) {
    // Enrollment remains available to signed-in applicants, as it is today.
    if (pathname === "/owner/onboarding") return safePath;
    const owner = dashboard("owner");
    if (!owner || (owner.href !== "/owner/dashboard" && pathname !== owner.href)) return fallback;
  }
  if (isPathWithin(pathname, "/affiliate") && pathname !== "/affiliate/login" && !dashboard("affiliate")) return fallback;
  return safePath;
}

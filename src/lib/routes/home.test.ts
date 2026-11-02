import { describe, expect, it } from "vitest";
import { getLoginDestination, getSafeReturnPath, type AccountNavigation } from "./home";

const guest: AccountNavigation = {
  label: "Guest", defaultHref: "/my-trip", dashboards: [{ id: "guest", label: "My Trip", href: "/my-trip" }],
};
const admin: AccountNavigation = {
  ...guest, defaultHref: "/admin", dashboards: [...guest.dashboards, { id: "admin", label: "Admin", href: "/admin" }],
};
const owner: AccountNavigation = {
  ...guest, defaultHref: "/owner/dashboard", dashboards: [...guest.dashboards, { id: "owner", label: "Owner Portal", href: "/owner/dashboard" }],
};

describe("safe return destinations", () => {
  it.each([
    "https://example.com", "//example.com", "/\\example.com", "/%2f%2fexample.com", "/%5cexample.com",
    "/%252fexample.com", "/%00admin", "/%0aadmin", "/bad%escape", "/bad path", "/\t/admin",
    "/%3f/admin", "/%23/admin", "javascript:alert(1)", "",
  ])("rejects unsafe destination %j", (value) => {
    expect(getSafeReturnPath(value)).toBeNull();
    expect(getLoginDestination(admin, value)).toBe("/admin");
  });

  it("preserves internal query strings and fragments", () => {
    expect(getLoginDestination(admin, "/resorts?ref=abc%20def#villas")).toBe("/resorts?ref=abc%20def#villas");
  });

  it.each(["/admin", "/admin/owners", "/%61dmin/owners", "/resorts/../admin/owners", "/%2e%2e/admin"])("checks normalized admin permissions for %s", (path) => {
    expect(getLoginDestination(guest, path)).toBe("/my-trip");
  });

  it("honors explicit authorized destinations before the admin default", () => {
    expect(getLoginDestination(admin, "/admin/owners?page=2")).toBe("/admin/owners?page=2");
    expect(getLoginDestination({ ...admin, dashboards: [...admin.dashboards, owner.dashboards[1]] }, "/owner/rentals#active")).toBe("/owner/rentals#active");
    expect(getLoginDestination(admin, "/profile")).toBe("/profile");
    expect(getLoginDestination(admin, "/owner/dashboard")).toBe("/admin");
    expect(getLoginDestination(guest, "/affiliate/resources")).toBe("/my-trip");
  });

  it("does not confuse public owner and guest pages with protected portal routes", () => {
    expect(getLoginDestination(guest, "/owners")).toBe("/owners");
    expect(getLoginDestination(guest, "/guests/policies")).toBe("/guests/policies");
  });

  it("preserves owner onboarding, agreements, and lifecycle restrictions", () => {
    expect(getLoginDestination(guest, "/owner/onboarding?ref=abc")).toBe("/owner/onboarding?ref=abc");
    expect(getLoginDestination(owner, "/owner/matches")).toBe("/owner/matches");
    const suspended: AccountNavigation = {
      ...owner, defaultHref: "/owner/account-status",
      dashboards: [{ id: "owner", label: "Owner Portal", href: "/owner/account-status" }],
    };
    expect(getLoginDestination(suspended, "/owner/rentals")).toBe("/owner/account-status");
    expect(getLoginDestination(suspended, "/owner/account-status")).toBe("/owner/account-status");
    expect(getLoginDestination({ ...suspended, defaultHref: "/admin" }, "/owner/onboarding/agreement")).toBe("/admin");
  });

  it("preserves affiliate confirmation and recovery entry points", () => {
    expect(getLoginDestination(guest, "/affiliate/login?mode=update")).toBe("/affiliate/login?mode=update");
    expect(getLoginDestination(guest, "/login?mode=update")).toBe("/login?mode=update");
  });

  it.each(["/api/admin/test", "/auth/callback?next=/admin", "/login", "/onboarding"])("does not route sign-in to %s", (path) => {
    expect(getLoginDestination(admin, path)).toBe("/admin");
  });

  it("does not resolve an anonymous caller into a protected dashboard", () => {
    expect(getLoginDestination(null, "/admin")).toBe("/login");
  });
});

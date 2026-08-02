// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import HeaderClient from "@/components/header-client";
import SiteFooterClient from "@/components/layout/SiteFooterClient";
import SupportWidget from "@/components/support/SupportWidget";
import OwnerMobileNav from "@/components/owner/shell/OwnerMobileNav";
import OwnerNavigation from "@/components/owner/shell/OwnerNavigation";
import {
  OWNER_NAVIGATION_ITEMS,
  getOwnerPageTitle,
  isOwnerNavigationItemActive,
} from "@/components/owner/shell/owner-navigation";

let pathname = "/owner/dashboard";
let search = "";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => ({
    toString: () => search,
  }),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/user-menu", () => ({
  default: () => <div>User menu</div>,
}));

vi.mock("@/components/layout/AffiliatePortalHeader", () => ({
  default: () => <div>Affiliate header</div>,
}));

vi.mock("@/components/PixieLogo", () => ({
  default: () => <div>HannaDVC logo</div>,
}));

vi.mock("@/components/SiteFooter", () => ({
  default: () => <footer>Public footer</footer>,
}));

vi.mock("@/components/support/SupportPanel", () => ({
  default: () => <div>Support panel</div>,
}));

vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    auth: {
      signOut: vi.fn(),
    },
  }),
}));

vi.mock("@/lib/intercom", () => ({
  openIntercom: () => false,
}));

describe("owner shell navigation", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: window.localStorage,
    });
  });

  beforeEach(() => {
    pathname = "/owner/dashboard";
    search = "";
  });

  it("maps active owner navigation items only to existing routes", () => {
    const hrefs = OWNER_NAVIGATION_ITEMS.map((item) => item.href);

    expect(hrefs).toContain("/owner/dashboard");
    expect(hrefs).toContain("/owner/dashboard?tab=earnings");
    expect(hrefs).toContain("/owner/ready-stays");
    expect(hrefs).toContain("/owner/rentals");
    expect(hrefs).toContain("/owner/rewards");
    expect(hrefs).toContain("/owner/payouts");
    expect(hrefs).toContain("/owner/notifications");
    expect(hrefs).not.toContain("/owner/calendar");
    expect(hrefs).not.toContain("/owner/messages");
  });

  it("marks nested routes against the correct parent item", () => {
    const reservations = OWNER_NAVIGATION_ITEMS.find((item) => item.href === "/owner/rentals");
    const listings = OWNER_NAVIGATION_ITEMS.find((item) => item.href === "/owner/ready-stays");
    const payouts = OWNER_NAVIGATION_ITEMS.find((item) => item.href === "/owner/payouts");

    expect(reservations && isOwnerNavigationItemActive(reservations, "/owner/matches/abc")).toBe(true);
    expect(listings && isOwnerNavigationItemActive(listings, "/owner/ready-stays/abc/booking-package")).toBe(true);
    expect(payouts && isOwnerNavigationItemActive(payouts, "/owner/ready-stays/abc")).toBe(false);
  });

  it("activates existing dashboard tab links without creating placeholder routes", () => {
    const earnings = OWNER_NAVIGATION_ITEMS.find((item) => item.label === "Earnings");
    const overview = OWNER_NAVIGATION_ITEMS.find((item) => item.label === "Overview");

    expect(earnings && isOwnerNavigationItemActive(earnings, "/owner/dashboard?tab=earnings")).toBe(true);
    expect(overview && isOwnerNavigationItemActive(overview, "/owner/dashboard?tab=earnings")).toBe(false);
  });

  it("derives safe page titles from the owner route", () => {
    expect(getOwnerPageTitle("/owner")).toBe("Overview");
    expect(getOwnerPageTitle("/owner/rentals/abc")).toBe("Reservations");
    expect(getOwnerPageTitle("/owner/ready-stays/new")).toBe("Ready Stays");
  });

  it("adds aria-current to the active navigation item", () => {
    pathname = "/owner/ready-stays/new";

    render(<OwnerNavigation section="primary" />);

    expect(screen.getByRole("link", { name: /listings/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /overview/i })).not.toHaveAttribute("aria-current");
  });
});

describe("owner mobile navigation", () => {
  beforeEach(() => {
    pathname = "/owner/dashboard";
    search = "";
  });

  it("opens, closes with escape, and restores focus", async () => {
    render(<OwnerMobileNav />);

    const trigger = screen.getByRole("button", { name: /open owner navigation/i });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: /owner navigation/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /owner navigation/i })).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });
});

describe("owner public chrome exclusions", () => {
  beforeEach(() => {
    pathname = "/owner/dashboard";
    search = "";
  });

  it("does not render the public header on owner routes", () => {
    const { container } = render(
      <HeaderClient
        userLabel="Owner"
        userRole="owner"
        isAdmin={false}
        isAuthenticated
        hasAffiliateAccess={false}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("does not render the public footer on owner routes", () => {
    const { container } = render(<SiteFooterClient />);

    expect(container).toBeEmptyDOMElement();
  });

  it("does not render the floating support widget on owner routes", () => {
    render(<SupportWidget />);

    expect(screen.queryByRole("button", { name: /open concierge support/i })).not.toBeInTheDocument();
  });

  it("leaves public marketing pages eligible for public chrome", () => {
    pathname = "/resorts";

    render(<SiteFooterClient />);

    expect(screen.getByText("Public footer")).toBeInTheDocument();
  });
});

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
    expect(hrefs).toContain("/owner/matches");
    expect(hrefs).toContain("/owner/ready-stays");
    expect(hrefs).toContain("/owner/rentals");
    expect(hrefs).toContain("/owner/rewards");
    expect(hrefs).toContain("/owner/payouts");
    expect(hrefs).toContain("/owner/notifications");
    expect(hrefs).not.toContain("/owner/calendar");
    expect(hrefs).not.toContain("/owner/messages");
  });

  it("marks nested routes against the correct parent item", () => {
    const matches = OWNER_NAVIGATION_ITEMS.find((item) => item.href === "/owner/matches");
    const reservations = OWNER_NAVIGATION_ITEMS.find((item) => item.href === "/owner/rentals");
    const listings = OWNER_NAVIGATION_ITEMS.find((item) => item.href === "/owner/ready-stays");
    const payouts = OWNER_NAVIGATION_ITEMS.find((item) => item.href === "/owner/payouts");

    expect(matches && isOwnerNavigationItemActive(matches, "/owner/matches/abc")).toBe(true);
    expect(reservations && isOwnerNavigationItemActive(reservations, "/owner/matches/abc")).toBe(false);
    expect(listings && isOwnerNavigationItemActive(listings, "/owner/ready-stays/abc/booking-package")).toBe(true);
    expect(payouts && isOwnerNavigationItemActive(payouts, "/owner/ready-stays/abc")).toBe(false);
  });

  it("activates the dashboard landing without creating placeholder routes", () => {
    const dashboard = OWNER_NAVIGATION_ITEMS.find((item) => item.label === "Dashboard");
    const matches = OWNER_NAVIGATION_ITEMS.find((item) => item.label === "Matches");

    expect(dashboard && isOwnerNavigationItemActive(dashboard, "/owner/dashboard")).toBe(true);
    expect(matches && isOwnerNavigationItemActive(matches, "/owner/dashboard")).toBe(false);
  });

  it("derives safe page titles from the owner route", () => {
    expect(getOwnerPageTitle("/owner")).toBe("Overview");
    expect(getOwnerPageTitle("/owner/rentals/abc")).toBe("Reservations");
    expect(getOwnerPageTitle("/owner/ready-stays/new")).toBe("Ready Stays");
  });

  it("adds aria-current to the active navigation item", () => {
    pathname = "/owner/ready-stays/new";

    render(<OwnerNavigation section="primary" />);

    expect(screen.getByRole("link", { name: /ready stays/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /dashboard/i })).not.toHaveAttribute("aria-current");
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

  it("portals the drawer outside the filtered top bar and closes through each touch target", async () => {
    const { container } = render(
      <header className="backdrop-blur">
        <OwnerMobileNav />
      </header>,
    );
    const trigger = screen.getByRole("button", { name: /open owner navigation/i });

    fireEvent.click(trigger);
    let dialog = screen.getByRole("dialog", { name: /owner navigation/i });
    expect(dialog.parentElement).toBe(document.body);
    expect(container).not.toContainElement(dialog);
    expect(dialog).toHaveClass("fixed", "inset-0", "z-[160]");
    expect(dialog.firstElementChild).toHaveClass("absolute", "inset-0");
    expect(dialog.lastElementChild).toHaveClass("relative", "flex");
    expect(dialog.querySelector(".overflow-y-auto")).toHaveClass("min-h-0", "flex-1");
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("link", { name: /matches/i })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /close owner navigation/i })[1]);
    expect(screen.queryByRole("dialog", { name: /owner navigation/i })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(trigger);
    dialog = screen.getByRole("dialog", { name: /owner navigation/i });
    fireEvent.click(screen.getAllByRole("button", { name: /close owner navigation/i })[0]);
    expect(dialog).not.toBeInTheDocument();

    fireEvent.click(trigger);
    const matches = screen.getByRole("link", { name: /matches/i });
    matches.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(matches);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /owner navigation/i })).not.toBeInTheDocument();
    });
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

  it("does not render public marketing chrome on my-trip routes", () => {
    pathname = "/my-trip/trip-1";

    const header = render(
      <HeaderClient
        userLabel="Guest"
        userRole="guest"
        isAdmin={false}
        isAuthenticated
        hasAffiliateAccess={false}
      />,
    );
    expect(header.container).toBeEmptyDOMElement();

    const footer = render(<SiteFooterClient />);
    expect(footer.container).toBeEmptyDOMElement();
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

  it("renders the public chrome on the Founding Owner marketing page", () => {
    pathname = "/owners/founders-club";

    const header = render(
      <HeaderClient
        userLabel={null}
        userRole={null}
        isAdmin={false}
        isAuthenticated={false}
        hasAffiliateAccess={false}
      />,
    );
    expect(header.container).not.toBeEmptyDOMElement();

    render(<SiteFooterClient />);
    expect(screen.getByText("Public footer")).toBeInTheDocument();
  });
});

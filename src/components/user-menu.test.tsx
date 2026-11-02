// @vitest-environment jsdom
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardDestination } from "@/lib/routes/home";
import UserMenu from "./user-menu";
import OwnerAccountMenu from "./owner/shell/OwnerAccountMenu";
import OwnerTopBar from "./owner/shell/OwnerTopBar";
import HeaderClient from "./header-client";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue({ error: null }),
  mutation: vi.fn(() => { throw new Error("Unexpected account mutation"); }),
  push: vi.fn(), refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  usePathname: () => "/resorts",
}));
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({ auth: { signOut: mocks.signOut, updateUser: mocks.mutation }, from: mocks.mutation }),
}));
vi.mock("@/components/PixieLogo", () => ({ default: () => <span>HannaDVC</span> }));
vi.mock("@/lib/intercom", () => ({ openIntercom: () => false }));
// Keep Link behavior deterministic while verifying its href and the menu close callback.
vi.mock("next/link", () => ({
  default: ({ href, onClick, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props} href={href} onClick={(event) => { event.preventDefault(); onClick?.(event); }}>{children}</a>
  ),
}));

const dashboards: DashboardDestination[] = [
  { id: "admin", label: "Admin", href: "/admin" },
  { id: "owner", label: "Owner Portal", href: "/owner/dashboard" },
  { id: "guest", label: "My Trip", href: "/my-trip" },
];
const identity = { displayName: "Owner Name", email: "owner@example.com", initials: "ON", avatarUrl: null };

describe("shared dashboard menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }));
  });

  it("renders only supplied dashboards and does not infer owner access from admin", () => {
    render(<UserMenu label="Admin user" dashboards={[dashboards[0], dashboards[2]]} />);
    fireEvent.click(screen.getByRole("button", { name: "Admin user" }));
    expect(screen.getByRole("menuitem", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(screen.queryByRole("menuitem", { name: "Owner Portal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Ready Stays" })).not.toBeInTheDocument();
  });

  it("switches from the owner menu without updating roles, profiles, or metadata", () => {
    render(<OwnerAccountMenu identity={identity} dashboards={dashboards} />);
    fireEvent.click(screen.getByRole("button", { name: "Owner Name account menu" }));
    expect(screen.getByRole("menuitem", { name: "Owner Portal" })).toHaveAttribute("aria-current", "page");
    const admin = screen.getByRole("menuitem", { name: "Admin" });
    expect(admin).toHaveAttribute("href", "/admin");
    fireEvent.click(admin);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(mocks.mutation).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("preserves owner settings, notifications, and sign-out behavior", async () => {
    render(<OwnerAccountMenu identity={identity} dashboards={dashboards} />);
    fireEvent.click(screen.getByRole("button", { name: "Owner Name account menu" }));
    expect(screen.getByRole("menuitem", { name: "Account settings" })).toHaveAttribute("href", "/owner/account");
    expect(screen.getByRole("menuitem", { name: "Notifications" })).toHaveAttribute("href", "/owner/notifications");
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/login"));
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("closes on Escape and restores trigger focus", () => {
    render(<OwnerAccountMenu identity={identity} dashboards={dashboards} />);
    const trigger = screen.getByRole("button", { name: "Owner Name account menu" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on an outside click", () => {
    render(<UserMenu label="Account" dashboards={dashboards} />);
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("uses the same dashboard list in desktop and mobile public navigation", () => {
    render(<HeaderClient userLabel="Account" dashboards={dashboards} isAdmin isAuthenticated />);
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    const desktop = screen.getByRole("menu", { name: "Account" });
    for (const dashboard of dashboards) {
      expect(within(desktop).getByRole("menuitem", { name: dashboard.label })).toHaveAttribute("href", dashboard.href);
    }
    fireEvent.click(screen.getByRole("button", { name: "Toggle navigation menu" }));
    for (const dashboard of dashboards) {
      expect(screen.getByRole("link", { name: dashboard.label })).toHaveAttribute("href", dashboard.href);
    }
    fireEvent.click(screen.getByRole("link", { name: "Admin" }));
    expect(screen.getByRole("button", { name: "Toggle navigation menu" })).toHaveAttribute("aria-expanded", "false");
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("keeps the owner website return and notification links available without opening a menu", () => {
    render(<OwnerTopBar identity={identity} dashboards={dashboards} />);
    const website = screen.getByRole("link", { name: "Back to HannaDVC" });
    expect(website).toHaveAttribute("href", "/");
    expect(website.className).not.toMatch(/hidden/);
    expect(screen.getByRole("link", { name: "Owner notifications" })).toHaveAttribute("href", "/owner/notifications");
    expect(screen.getByRole("button", { name: "Open owner navigation" })).toBeInTheDocument();
  });
});

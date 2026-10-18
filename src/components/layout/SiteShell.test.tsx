// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SiteShell from "./SiteShell";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("./SiteFooterClient", () => ({ default: () => <footer>Public footer</footer> }));
vi.mock("@/components/chat/IntercomProvider", () => ({ default: () => <div>Public chat</div> }));
vi.mock("@/components/support/SupportWidget", () => ({ default: () => <div>Concierge widget</div> }));

afterEach(() => {
  pathname = "/";
});

describe("SiteShell", () => {
  it.each(["/admin", "/admin/inbox", "/admin/owners/verifications"]) (
    "omits public chrome for %s",
    (route) => {
      pathname = route;
      render(<SiteShell header={<header>Public header and tagline</header>}><div>Admin content</div></SiteShell>);

      expect(screen.getByText("Admin content")).toBeInTheDocument();
      expect(screen.queryByText("Public header and tagline")).not.toBeInTheDocument();
      expect(screen.queryByText("Public footer")).not.toBeInTheDocument();
      expect(screen.queryByText("Concierge widget")).not.toBeInTheDocument();
      expect(screen.queryByText("Public chat")).not.toBeInTheDocument();
    },
  );

  it.each(["/", "/resorts", "/administer"]) ("keeps public chrome for %s", (route) => {
    pathname = route;
    render(<SiteShell header={<header>Public header and tagline</header>}><div>Public content</div></SiteShell>);

    expect(screen.getByText("Public content")).toBeInTheDocument();
    expect(screen.getByText("Public header and tagline")).toBeInTheDocument();
    expect(screen.getByText("Public footer")).toBeInTheDocument();
    expect(screen.getByText("Concierge widget")).toBeInTheDocument();
    expect(screen.getByText("Public chat")).toBeInTheDocument();
  });
});

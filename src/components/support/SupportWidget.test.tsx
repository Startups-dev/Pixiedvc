// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SupportWidget from "@/components/support/SupportWidget";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("@/components/support/SupportPanel", () => ({
  default: () => <div>Support panel</div>,
}));

describe("SupportWidget route exclusions", () => {
  beforeEach(() => {
    pathname = "/";
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

  it("does not mount the floating support widget on My Vacation routes", () => {
    pathname = "/my-trip/34ab294f-587f-4e3e-b9ec-4886b9991958";

    render(<SupportWidget />);

    expect(screen.queryByRole("button", { name: /open concierge support/i })).not.toBeInTheDocument();
  });

  it("keeps the floating support widget available on public routes", () => {
    pathname = "/resorts";

    render(<SupportWidget />);

    expect(screen.getByRole("button", { name: /open concierge support/i })).toBeInTheDocument();
  });
});

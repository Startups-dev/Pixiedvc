// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OwnerAccountMenu from "./OwnerAccountMenu";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    auth: {
      signOut: vi.fn(),
    },
  }),
}));

describe("OwnerAccountMenu", () => {
  it("renders real owner identity instead of generic fallback", () => {
    render(
      <OwnerAccountMenu
        identity={{
          displayName: "Helena Aranha",
          email: "helena@example.com",
          avatarUrl: null,
          initials: "HA",
        }}
      />,
    );

    expect(screen.getByText("Helena Aranha")).toBeInTheDocument();
    expect(screen.getByText("helena@example.com")).toBeInTheDocument();
    expect(screen.getByText("HA")).toBeInTheDocument();
    expect(screen.queryByText("Account")).not.toBeInTheDocument();
  });

  it("renders avatar image when present and links to account settings", () => {
    render(
      <OwnerAccountMenu
        identity={{
          displayName: "Helena Aranha",
          email: "helena@example.com",
          avatarUrl: "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Owners-images/owners/user/avatar/1.png",
          initials: "HA",
        }}
      />,
    );

    expect(screen.getByAltText("Helena Aranha profile photo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("menuitem", { name: "Account settings" })).toHaveAttribute("href", "/owner/account");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
  });
});

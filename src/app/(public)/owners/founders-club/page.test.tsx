import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FoundersClubPage from "./page";

const getActivePromotion = vi.hoisted(() => vi.fn());

vi.mock("@/lib/pricing-promotions", () => ({ getActivePromotion }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdminClient: () => ({}) }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("@/components/founding-owner/FoundersJourneyLink", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

describe("Founders Club page", () => {
  beforeEach(() => getActivePromotion.mockReset());

  it("shows the saved closing time and regular onboarding links while launch is active", async () => {
    getActivePromotion.mockResolvedValue({ data: {
      id: "founders", name: "Founders Launch", is_active: true,
      starts_at: "2026-06-01T04:00:00.000Z", ends_at: "2026-12-31T23:59:00.000Z",
    } });
    render(await FoundersClubPage());

    expect(screen.getAllByText("Enroll by December 31, 2026 at 6:59 PM EST.")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Join as a Founding Owner" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Join as a Founding Owner" }).every((link) => link.getAttribute("href") === "/owner/onboarding")).toBe(true);
    expect(screen.getByText("300 rented points = $600 extra.")).toBeTruthy();
    expect(screen.getByText("Do I need a separate Founders application?")).toBeTruthy();
  });

  it("offers regular signup without a bonus promise after launch", async () => {
    getActivePromotion.mockResolvedValue({ data: null });
    render(await FoundersClubPage());

    expect(screen.getByRole("heading", { name: "Founding Owner enrollment has closed." })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Sign up as an owner" })).toHaveLength(2);
    expect(screen.queryByText("300 rented points = $600 extra.")).toBeNull();
    expect(screen.getByText("What happens to existing Founding Owners?")).toBeTruthy();
  });
});

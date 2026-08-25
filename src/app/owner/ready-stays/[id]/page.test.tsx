// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ReadyStayRow = {
  id: string;
  rental_id: string | null;
  status: string;
  verification_status: string | null;
  verification_review_notes: string | null;
  check_in: string | null;
  check_out: string | null;
  room_type: string | null;
  points: number | null;
  owner_price_per_point_cents: number | null;
  created_at: string | null;
  updated_at: string | null;
  reservation_proof_uploaded_at: string | null;
  is_visible_publicly: boolean | null;
  slug: string | null;
  title: string | null;
  image_url: string | null;
  expires_at: string | null;
  locked_until: string | null;
  resorts: { name: string | null; slug: string | null; calculator_code: string | null } | null;
};

let readyStayRow: ReadyStayRow | null = null;

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

vi.mock("@/components/owner/ReadyStayMarkdownForm", () => ({
  default: () => <button type="button">Edit payout</button>,
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "owner-user-1" } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: readyStayRow, error: null })),
          })),
        })),
      })),
    })),
  })),
}));

function activeReadyStay(overrides: Partial<ReadyStayRow> = {}): ReadyStayRow {
  return {
    id: overrides.id ?? "stay-1",
    rental_id: overrides.rental_id ?? "rental-1",
    status: overrides.status ?? "active",
    verification_status: overrides.verification_status ?? "approved",
    verification_review_notes: overrides.verification_review_notes ?? null,
    check_in: overrides.check_in ?? "2026-09-01",
    check_out: overrides.check_out ?? "2026-09-03",
    room_type: overrides.room_type ?? "Deluxe Studio - Lake View",
    points: overrides.points ?? 32,
    owner_price_per_point_cents: overrides.owner_price_per_point_cents ?? 2300,
    created_at: overrides.created_at ?? "2026-08-01T00:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-08-02T00:00:00.000Z",
    reservation_proof_uploaded_at: overrides.reservation_proof_uploaded_at ?? "2026-08-01T00:00:00.000Z",
    is_visible_publicly: overrides.is_visible_publicly ?? true,
    slug: overrides.slug ?? "bay-lake-tower-sep-2026",
    title: overrides.title ?? "Bay Lake Tower ready stay",
    image_url:
      overrides.image_url ??
      "https://hannadvc.test/storage/v1/object/public/resorts/bay-lake-tower/BTC1.png",
    expires_at: overrides.expires_at ?? null,
    locked_until: overrides.locked_until ?? null,
    resorts: overrides.resorts ?? { name: "Bay Lake Tower", slug: "bay-lake-tower", calculator_code: "BLT" },
  };
}

describe("OwnerReadyStayDetailPage", () => {
  beforeEach(() => {
    readyStayRow = activeReadyStay();
  });

  it("renders a premium owner manage view with one LIVE status and a public listing action", async () => {
    const { default: OwnerReadyStayDetailPage } = await import("./page");
    render(await OwnerReadyStayDetailPage({ params: { id: "stay-1" }, searchParams: {} }));

    expect(screen.getByRole("img", { name: "Bay Lake Tower resort" })).toHaveAttribute(
      "src",
      expect.stringContaining("/storage/v1/object/public/resorts/bay-lake-tower/BTC1.png"),
    );
    expect(screen.getByRole("heading", { name: "Bay Lake Tower" })).toBeInTheDocument();
    expect(screen.getAllByText("Deluxe Studio - Lake View")[0]).toBeInTheDocument();
    expect(screen.getByText("Sep 1, 2026 - Sep 3, 2026")).toBeInTheDocument();
    expect(screen.getByText("32 pts")).toBeInTheDocument();
    expect(screen.getAllByText("$23")[0]).toBeInTheDocument();
    expect(screen.getAllByText("$736")[0]).toBeInTheDocument();
    expect(screen.getAllByText("LIVE")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "View public listing" })).toHaveAttribute("href", "/ready-stays/stay-1");
    expect(screen.getByRole("link", { name: "Back to Ready Stays" })).toHaveAttribute("href", "/owner/ready-stays");
    expect(screen.getByRole("button", { name: "Edit payout" })).toBeInTheDocument();
  });

  it("does not link pending non-public listings to the public route", async () => {
    readyStayRow = activeReadyStay({
      status: "draft",
      verification_status: "proof_uploaded",
      is_visible_publicly: false,
      slug: null,
      title: null,
      image_url: null,
    });

    const { default: OwnerReadyStayDetailPage } = await import("./page");
    render(await OwnerReadyStayDetailPage({ params: { id: "stay-1" }, searchParams: {} }));

    expect(screen.getAllByText("IN REVIEW")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "View public listing" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Ready Stays" })).toHaveAttribute("href", "/owner/ready-stays");
  });
});

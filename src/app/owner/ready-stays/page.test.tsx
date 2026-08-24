// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ReadyStayRow = {
  id: string;
  status: string;
  verification_status: string | null;
  sold_booking_request_id: string | null;
  booking_request_id: string | null;
  check_in: string | null;
  check_out: string | null;
  room_type: string | null;
  points: number | null;
  owner_price_per_point_cents: number | null;
  reservation_proof_uploaded_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  resorts: { name: string | null; slug: string | null; calculator_code: string | null } | null;
};

type BookingRow = {
  id: string;
  status: string;
  owner_transfer_confirmed_at: string | null;
};

const readyStayRows: ReadyStayRow[] = [];
const bookingRows: BookingRow[] = [];

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

vi.mock("@/lib/owner/requireOwnerAccess", () => ({
  requireOwnerAccess: vi.fn(async () => ({
    user: { id: "owner-user-1" },
    owner: { id: "owner-1", user_id: "owner-user-1" },
  })),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: vi.fn(() => ({
    from(table: string) {
      if (table === "ready_stays") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(async () => ({ data: readyStayRows, error: null })),
            })),
          })),
        };
      }
      if (table === "booking_requests") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({ data: bookingRows, error: null })),
          })),
        };
      }
      throw new Error(`unexpected table:${table}`);
    },
  })),
}));

vi.mock("./PendingTransfersCard", () => ({
  default: () => <div>Pending transfer rows</div>,
}));

describe("ReadyStaysPage", () => {
  beforeEach(() => {
    readyStayRows.length = 0;
    bookingRows.length = 0;
  });

  it("keeps pending transfers and completed sales sections in the redesigned page", async () => {
    readyStayRows.push({
      id: "stay-sold",
      status: "sold",
      verification_status: "approved",
      sold_booking_request_id: "booking-1",
      booking_request_id: null,
      check_in: "2026-09-01",
      check_out: "2026-09-03",
      room_type: "Deluxe Studio - Lake View",
      points: 32,
      owner_price_per_point_cents: 2300,
      reservation_proof_uploaded_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      resorts: { name: "Bay Lake Tower", slug: "bay-lake-tower", calculator_code: "BLT" },
    });
    bookingRows.push({
      id: "booking-1",
      status: "paid_waiting_owner_transfer",
      owner_transfer_confirmed_at: null,
    });

    const { default: ReadyStaysPage } = await import("./page");
    render(await ReadyStaysPage({ searchParams: {} }));

    expect(screen.getByRole("heading", { name: "Pending Transfers" })).toBeInTheDocument();
    expect(screen.getByText("Pending transfer rows")).toBeInTheDocument();
    expect(screen.getByText("Completed Sales")).toBeInTheDocument();
    expect(screen.getByText("Bay Lake Tower")).toBeInTheDocument();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  userId: "guest-1" as string | null,
  rows: [] as Record<string, unknown>[],
  error: null as { code: string; message: string } | null,
  filters: [] as [string, unknown][],
}));

vi.mock("next/headers", () => ({ cookies: async () => ({}) }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => { throw new Error(`redirect:${href}`); },
}));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.userId ? { id: state.userId } : null } }) },
    from: () => {
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { state.filters.push([column, value]); return query; },
        in: (column: string, value: unknown) => { state.filters.push([column, value]); return query; },
        order: async () => ({ data: state.rows, error: state.error }),
      };
      return query;
    },
  }),
}));

import GuestDashboard from "./page";

function request(isTest = false) {
  return {
    id: "request-1", status: "submitted", is_test_booking: isTest,
    created_at: "2026-11-01T12:00:00Z", check_in: null, check_out: null,
    room_type: "Studio", adults: 1, youths: 0, total_points: 90,
    resort: { name: "Test Resort" },
  };
}

describe("Your Requests", () => {
  beforeEach(() => {
    state.userId = "guest-1";
    state.rows = [];
    state.error = null;
    state.filters = [];
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it.each([false, true])("renders a submitted request, including TEST=%s, scoped to the signed-in guest", async (isTest) => {
    state.rows = [request(isTest)];
    render(await GuestDashboard());
    expect(screen.getByRole("link", { name: /Test Resort/ })).toHaveAttribute("href", "/guest/requests/request-1");
    expect(screen.getByText("submitted")).toBeInTheDocument();
    expect(Boolean(screen.queryByText("TEST · No deposit paid · No reservation confirmed"))).toBe(isTest);
    expect(state.filters).toContainEqual(["renter_id", "guest-1"]);
    expect(state.filters).toContainEqual(["status", ["submitted", "pending_match", "pending_owner", "matched", "confirmed", "cancelled"]]);
    expect(state.filters.map(([column]) => column)).toEqual(["renter_id", "status"]);
  });

  it("shows the empty state only after a successful empty query", async () => {
    render(await GuestDashboard());
    expect(screen.getByText(/No requests yet/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error instead of an empty account or partial results, without exposing database details", async () => {
    state.rows = [request()];
    state.error = { code: "42501", message: "permission denied for function is_admin" };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    render(await GuestDashboard());
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t load your requests. Please refresh the page to try again.");
    expect(screen.queryByText(/No requests yet/)).not.toBeInTheDocument();
    expect(screen.queryByText("Test Resort")).not.toBeInTheDocument();
    expect(screen.queryByText("0", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText(/is_admin|42501/)).not.toBeInTheDocument();
    expect(log).toHaveBeenCalledWith("[guest] failed to load requests", { code: "42501" });
  });

  it("requires authentication before querying reservations", async () => {
    state.userId = null;
    await expect(GuestDashboard()).rejects.toThrow("redirect:/login?redirect=/guest");
    expect(state.filters).toEqual([]);
  });
});

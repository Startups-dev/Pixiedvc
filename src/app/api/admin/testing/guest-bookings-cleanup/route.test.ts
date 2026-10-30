import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ admin: true, guestId: "11111111-1111-4111-8111-111111111111", calls: [] as unknown[][] }));
vi.mock("@/lib/admin-emails", () => ({ emailIsAllowedForAdmin: () => state.admin }));
vi.mock("@/lib/test-guest-booking", () => ({ designatedTestGuestId: () => state.guestId }));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "admin-1", email: "admin@example.com" } } }) } }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({ rpc: async (...args: unknown[]) => {
    state.calls.push(args);
    return { data: [{ candidate_count: 2, deleted_count: args[1] && (args[1] as { p_execute: boolean }).p_execute ? 2 : 0 }], error: null };
  } }),
}));

import { GET, POST } from "./route";

describe("single guest cleanup endpoint", () => {
  beforeEach(() => { state.admin = true; state.calls.length = 0; });

  it("defaults to a dry run scoped to the configured Auth UUID", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(state.calls).toEqual([["cleanup_single_guest_test_bookings", { p_guest_id: state.guestId, p_execute: false }]]);
  });

  it("requires admin access and explicit deletion confirmation", async () => {
    const request = (confirm: string) => new Request("http://localhost/api/admin/testing/guest-bookings-cleanup", {
      method: "POST", body: JSON.stringify({ confirm }),
    });
    expect((await POST(request("wrong"))).status).toBe(400);
    expect(state.calls).toHaveLength(0);
    state.admin = false;
    expect((await POST(request("DELETE_TEST_BOOKINGS"))).status).toBe(403);
    expect(state.calls).toHaveLength(0);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "renter-1" } as { id: string } | null,
  insertResult: { data: null as Record<string, unknown> | null, error: null as { code?: string; message: string } | null },
  existing: null as Record<string, unknown> | null,
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        state.insert(row);
        return { select: () => ({ single: async () => state.insertResult }) };
      },
      select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.existing }) }) }) }) }),
    }),
  }),
}));

import { POST } from "./route";

const payload = {
  resort_id: null, room_type: "Studio", check_in: "2026-12-01", check_out: "2026-12-06",
  adults: 2, children: 0, max_price_per_point: 20,
};
const request = (body: unknown) => new Request("http://localhost/api/renter/request", { method: "POST", body: JSON.stringify(body) });

describe("legacy reservation request intake", () => {
  beforeEach(() => {
    state.user = { id: "renter-1" };
    state.insertResult = { data: { id: "request-1", status: "submitted" }, error: null };
    state.existing = null;
    state.insert.mockClear();
  });

  it("saves a submitted request with a stable retry key", async () => {
    const first = await POST(request(payload));
    const second = await POST(request(payload));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(state.insert).toHaveBeenCalledTimes(2);
    expect(state.insert.mock.calls[0][0]).toMatchObject({ status: "submitted", renter_id: "renter-1" });
    expect(state.insert.mock.calls[0][0].submission_key).toBe(state.insert.mock.calls[1][0].submission_key);
  });

  it("returns the original request after the database rejects a duplicate", async () => {
    state.insertResult = { data: null, error: { code: "23505", message: "unique violation" } };
    state.existing = { id: "request-1", status: "submitted" };
    const response = await POST(request(payload));
    expect(response.status).toBe(200);
    expect((await response.json()).request.id).toBe("request-1");
  });

  it("does not save an invalid or unauthenticated submission", async () => {
    expect((await POST(request({ ...payload, check_out: payload.check_in }))).status).toBe(400);
    state.user = null;
    expect((await POST(request(payload))).status).toBe(401);
    expect(state.insert).not.toHaveBeenCalled();
  });

  it("reports a failed write without returning success", async () => {
    state.insertResult = { data: null, error: { message: "write failed" } };
    expect((await POST(request(payload))).status).toBe(400);
  });
});

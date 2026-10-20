import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  updated: [] as Array<Record<string, unknown>>,
  dbCalls: 0,
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({
    from: () => {
      state.dbCalls += 1;
      let action = "select";
      let value: Record<string, unknown> = {};
      // Supabase's fluent query builder is dynamically mocked in this test.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = {
        select: () => q,
        eq: () => q,
        in: () => q,
        order: () => q,
        limit: () => q,
        maybeSingle: async () => ({ data: { id: "app-1", auth_user_id: null }, error: null }),
        update: (payload: Record<string, unknown>) => { action = "update"; value = payload; return q; },
        then: (resolve: (result: unknown) => unknown) => {
          if (action === "update") state.updated.push(value);
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return q;
    },
  }),
}));

import { POST } from "./route";

function request(email: string) {
  return new Request("https://hannadvc.com/api/affiliate/account", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }),
  });
}

describe("affiliate account application lookup privacy", () => {
  beforeEach(() => { state.user = null; state.updated.length = 0; state.dbCalls = 0; });

  it("does not query or reveal application status for an unauthenticated email", async () => {
    const response = await POST(request("private@example.test"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, linked: false });
    expect(state.dbCalls).toBe(0);
  });

  it("does not link an application when the authenticated account email differs", async () => {
    state.user = { id: "user-1", email: "owner@example.test" };
    const response = await POST(request("private@example.test"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, linked: false });
    expect(state.dbCalls).toBe(0);
  });

  it("links only the authenticated user's matching email and returns no private status", async () => {
    state.user = { id: "user-1", email: "private@example.test" };
    const response = await POST(request("private@example.test"));
    expect(await response.json()).toEqual({ ok: true, linked: true });
    expect(state.updated).toEqual([{ auth_user_id: "user-1" }]);
  });
});

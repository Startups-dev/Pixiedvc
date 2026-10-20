import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  application: null as Record<string, unknown> | null,
  authUser: null as { id: string; email: string } | null,
  affiliate: null as Record<string, unknown> | null,
  generatedInvites: [] as string[],
  welcome: [] as string[],
  welcomePayloads: [] as Array<Record<string, unknown>>,
  welcomeStatus: "sent" as "sent" | "failed",
  writes: [] as Array<{ table: string; operation: string; value: Record<string, unknown> }>,
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "admin-1", email: "admin@example.test" } } }) } }),
}));
vi.mock("@/lib/require-admin", () => ({ requireAdminEmail: () => undefined }));
vi.mock("@/lib/affiliate-referrals", () => ({ normalizeAffiliateSlug: (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }));
vi.mock("@/lib/affiliate-emails", () => ({
  sendAffiliateRejection: vi.fn(async () => ({ status: "sent" })),
  sendAffiliateWelcome: vi.fn(async (payload: Record<string, unknown>) => { state.welcome.push("welcome"); state.welcomePayloads.push(payload); return { status: state.welcomeStatus }; }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({
    auth: { admin: {
      listUsers: async () => ({ data: { users: state.authUser ? [state.authUser] : [] }, error: null }),
      generateLink: async (args: { type: string; email: string }) => {
        state.generatedInvites.push(args.email);
        state.authUser = { id: "new-auth-user", email: args.email };
        return { data: { user: state.authUser, properties: { action_link: "https://auth.example.test/verify?token=synthetic" } }, error: null };
      },
    } },
    from(table: string) {
      let operation = "select";
      let value: Record<string, unknown> = {};
      const filters: Array<[string, unknown]> = [];
      // Supabase's generated fluent query builder has overloaded return types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: any = {
        select: () => query,
        eq: (column: string, item: unknown) => { filters.push([column, item]); return query; },
        maybeSingle: async () => {
          if (table === "affiliate_applications") return { data: state.application, error: null };
          if (table === "affiliates") {
            if (state.affiliate && filters.some(([column, item]) => column === "email" && item === state.affiliate?.email)) return { data: state.affiliate, error: null };
            if (state.affiliate && filters.some(([column, item]) => column === "auth_user_id" && item === state.affiliate?.auth_user_id)) return { data: state.affiliate, error: null };
            return { data: null, error: null };
          }
          if (table === "profiles") return { data: null, error: null };
          return { data: null, error: null };
        },
        update: (payload: Record<string, unknown>) => { operation = "update"; value = payload; state.writes.push({ table, operation, value }); if (table === "affiliate_applications" && state.application) Object.assign(state.application, payload); return query; },
        insert: (payload: Record<string, unknown>) => { operation = "insert"; value = payload; state.writes.push({ table, operation, value }); if (table === "affiliates") state.affiliate = { ...payload, id: "affiliate-new" }; return query; },
        then: (resolve: (result: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
      };
      return query;
    },
  }),
}));

import { PATCH } from "./route";

function request() {
  return new Request("https://hannadvc.com/api/admin/affiliates/applications", {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "application-1", action: "approve_basic" }),
  });
}

describe("affiliate application approval notifications", () => {
  beforeEach(() => {
    state.application = {
      id: "application-1", display_name: "Synthetic Affiliate", email: "synthetic-affiliate@example.test",
      website: "https://example.test", social_links: [], traffic_estimate: "synthetic", promotion_description: "synthetic", status: "pending",
    };
    state.authUser = null;
    state.affiliate = null;
    state.generatedInvites.length = 0;
    state.welcome.length = 0;
    state.welcomePayloads.length = 0;
    state.welcomeStatus = "sent";
    state.writes.length = 0;
  });

  it("sends the generated Auth invitation link in one tracked welcome email for a new user", async () => {
    const response = await PATCH(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, notification: "accepted" });
    expect(state.generatedInvites).toEqual(["synthetic-affiliate@example.test"]);
    expect(state.welcome).toHaveLength(1);
    expect(state.welcomePayloads[0]).toMatchObject({ accessUrl: "https://auth.example.test/verify?token=synthetic" });
    expect(state.application?.status).toBe("approved");
  });

  it("sends existing users a welcome and reports delivery-request failure without undoing approval", async () => {
    state.authUser = { id: "existing-auth-user", email: "synthetic-affiliate@example.test" };
    state.welcomeStatus = "failed";
    const response = await PATCH(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, notification: "failed" });
    expect(state.generatedInvites).toHaveLength(0);
    expect(state.welcome).toHaveLength(1);
    expect(state.application?.status).toBe("approved");
  });

  it("does not repeat approval notification work when the same action is submitted again", async () => {
    const first = await PATCH(request());
    expect(first.status).toBe(200);
    const second = await PATCH(request());
    expect(second.status).toBe(400);
    expect(state.generatedInvites).toHaveLength(1);
    expect(state.welcome).toHaveLength(1);
  });
});

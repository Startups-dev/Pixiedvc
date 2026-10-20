import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  item: { id: "payout-synthetic", status: "pending", conversion_id: "conversion-synthetic", affiliate_id: "affiliate-synthetic", amount_usd: 123.45 } as Record<string, unknown>,
  updates: [] as Array<{ table: string; value: Record<string, unknown> }>,
  notifications: [] as Array<Record<string, unknown>>,
  notificationStatus: "failed" as "sent" | "failed",
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "admin-1", email: "admin@example.test" } } }) } }),
}));
vi.mock("@/lib/require-admin", () => ({ requireAdminEmail: () => undefined }));
vi.mock("@/lib/affiliate-emails", () => ({
  sendAffiliatePayoutPaid: vi.fn(async (payload: Record<string, unknown>) => { state.notifications.push(payload); return { status: state.notificationStatus }; }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({
    from(table: string) {
      let operation = "select";
      let value: Record<string, unknown> = {};
      // Supabase's fluent query builder is dynamically mocked in this test.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: any = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: async () => ({
          data: table === "affiliate_payout_items" ? state.item
            : table === "affiliates" ? { id: "affiliate-synthetic", auth_user_id: "affiliate-user", display_name: "Synthetic Affiliate", email: "synthetic-affiliate@example.test" }
              : table === "support_conversations" ? { id: "affiliate-conversation" } : null,
          error: null,
        }),
        update: (payload: Record<string, unknown>) => { operation = "update"; value = payload; state.updates.push({ table, value }); if (table === "affiliate_payout_items") Object.assign(state.item, payload); return query; },
        then: (resolve: (result: unknown) => unknown) => Promise.resolve(operation === "update" ? { error: null } : { error: null }).then(resolve),
      };
      return query;
    },
  }),
}));

import { PATCH } from "./route";

function request() {
  return new Request("https://hannadvc.com/api/admin/affiliates/payouts", {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "mark_item_paid", item_id: "payout-synthetic" }),
  });
}

describe("affiliate paid-payout notifications", () => {
  beforeEach(() => {
    state.item = { id: "payout-synthetic", status: "pending", conversion_id: "conversion-synthetic", affiliate_id: "affiliate-synthetic", amount_usd: 123.45 };
    state.updates.length = 0;
    state.notifications.length = 0;
    state.notificationStatus = "failed";
  });

  it("notifies only after the recorded payout is marked paid and prevents duplicate action sends", async () => {
    const first = await PATCH(request());
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ ok: true, payoutNotification: "failed" });
    expect(state.item.status).toBe("paid");
    expect(state.notifications[0]).toMatchObject({ amountUsd: 123.45, payoutItemId: "payout-synthetic" });

    const repeated = await PATCH(request());
    expect(repeated.status).toBe(200);
    expect(await repeated.json()).toMatchObject({ ok: true, deduplicated: true });
    expect(state.notifications).toHaveLength(1);
  });
});

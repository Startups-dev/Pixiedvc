import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  existingApplication: null as Record<string, unknown> | null,
  insertCalls: [] as Array<{ table: string; value: Record<string, unknown> }>,
  sendResults: { acknowledgment: "sent" as "sent" | "failed", staff: "sent" as "sent" | "failed" },
  sends: [] as string[],
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({
    from(table: string) {
      let operation = "select";
      let value: Record<string, unknown> = {};
      // Supabase's generated fluent query builder is dynamically mocked here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: any = {
        select: () => query,
        eq: () => query,
        in: () => query,
        insert: (payload: Record<string, unknown>) => { operation = "insert"; value = payload; state.insertCalls.push({ table, value }); return query; },
        upsert: (payload: Record<string, unknown>) => { operation = "upsert"; value = payload; state.insertCalls.push({ table, value }); return query; },
        maybeSingle: async () => ({ data: operation === "select" && table === "affiliate_applications" ? state.existingApplication : table === "support_conversations" && operation === "insert" ? { id: "conversation-synthetic" } : null, error: null }),
        single: async () => ({ data: { id: "application-synthetic" }, error: null }),
        then: (resolve: (result: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
      };
      return query;
    },
  }),
}));

vi.mock("@/lib/affiliate-emails", () => ({
  sendAffiliateApplicationAcknowledgment: vi.fn(async () => { state.sends.push("acknowledgment"); return { status: state.sendResults.acknowledgment }; }),
  sendAffiliateApplicationStaffAlert: vi.fn(async () => { state.sends.push("staff"); return { status: state.sendResults.staff }; }),
}));

import { POST } from "./route";

const payload = {
  fullName: "Synthetic Applicant",
  email: "synthetic-applicant@example.test",
  websiteOrChannelUrl: "https://example.test/partner",
  promotionPlan: "Synthetic local test application.",
  agreed: true,
};

function request() {
  return new Request("https://hannadvc.com/api/affiliate/apply", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  });
}

describe("affiliate application notifications", () => {
  beforeEach(() => {
    state.existingApplication = null;
    state.insertCalls.length = 0;
    state.sends.length = 0;
    state.sendResults = { acknowledgment: "sent", staff: "sent" };
  });

  it("persists the application even when either email notification fails", async () => {
    state.sendResults = { acknowledgment: "failed", staff: "sent" };
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      notifications: { applicantAcknowledgment: "failed", staffAlert: "accepted" },
    });
    expect(state.insertCalls.some((call) => call.table === "affiliate_applications")).toBe(true);
    expect(state.insertCalls.some((call) => call.table === "support_messages" && call.value.visibility === "customer")).toBe(true);
  });

  it("does not create a duplicate application or resend notifications for repeated submissions", async () => {
    state.existingApplication = { id: "already-received", status: "pending" };
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, duplicate: true });
    expect(state.insertCalls).toHaveLength(0);
    expect(state.sends).toHaveLength(0);
  });
});

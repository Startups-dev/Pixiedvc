import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "user-affiliate-1", email: "partner@example.test" } as { id: string; email: string } | null,
  affiliate: { id: "affiliate-1", display_name: "Synthetic Partner", email: "partner@example.test", status: "active" } as Record<string, unknown> | null,
  application: { id: "application-1", status: "approved", created_at: "2026-10-19T12:00:00.000Z" } as Record<string, unknown> | null,
  existingConversation: null as Record<string, unknown> | null,
  insertedConversation: null as Record<string, unknown> | null,
  insertedMessages: [] as Array<Record<string, unknown>>,
  updates: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  serviceReads: 0,
}));

function builder(table: string) {
  let operation = "select";
  let payload: Record<string, unknown> | null = null;
  // Supabase's generated fluent query builder is dynamically mocked here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = {
    select: () => q,
    eq: () => q,
    neq: () => q,
    order: () => q,
    limit: () => q,
    maybeSingle: async () => ({
      data: table === "affiliates" ? state.affiliate : table === "affiliate_applications" ? state.application : table === "support_conversations" ? state.existingConversation : null,
      error: null,
    }),
    single: async () => ({ data: { id: "conversation-new" }, error: null }),
    insert: (value: Record<string, unknown>) => {
      operation = "insert";
      payload = value;
      if (table === "support_conversations") state.insertedConversation = value;
      if (table === "support_messages") state.insertedMessages.push(value);
      return q;
    },
    update: (value: Record<string, unknown>) => { operation = "update"; payload = value; return q; },
    upsert: (value: Record<string, unknown>) => { operation = "upsert"; payload = value; return q; },
    then: (resolve: (value: unknown) => unknown) => {
      if (operation === "update" || operation === "upsert") state.updates.push({ table, payload: payload ?? {} });
      return Promise.resolve({ data: null, error: null }).then(resolve);
    },
  };
  return q;
}

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({ from: (table: string) => { state.serviceReads += 1; return builder(table); } }),
}));

import { POST } from "./route";

function request(body: Record<string, unknown>) {
  return new Request("https://hannadvc.com/api/affiliate/support", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("authenticated affiliate support", () => {
  beforeEach(() => {
    state.user = { id: "user-affiliate-1", email: "partner@example.test" };
    state.affiliate = { id: "affiliate-1", display_name: "Synthetic Partner", email: "partner@example.test", status: "active" };
    state.application = { id: "application-1", status: "approved", created_at: "2026-10-19T12:00:00.000Z" };
    state.existingConversation = null;
    state.insertedConversation = null;
    state.insertedMessages.length = 0;
    state.updates.length = 0;
    state.serviceReads = 0;
  });

  it("rejects visitors before reading affiliate records", async () => {
    state.user = null;
    const response = await POST(request({ subject: "Question", message: "A synthetic support question." }));
    expect(response.status).toBe(401);
    expect(state.serviceReads).toBe(0);
  });

  it("binds a new conversation to the authenticated affiliate and stores only a customer message", async () => {
    const response = await POST(request({
      subject: "Payout question", message: "Can you explain the recorded payout status?",
      email: "another-person@example.test", affiliateId: "spoofed-affiliate-id",
    }));
    expect(response.status).toBe(200);
    expect(state.insertedConversation).toMatchObject({
      guest_user_id: "user-affiliate-1",
      guest_email: "partner@example.test",
      affiliate_id: "affiliate-1",
      affiliate_application_id: "application-1",
      inbox_source: "support_handoff",
      inbox_status: "needs_reply",
      context: { audience: "affiliate", affiliate_id: "affiliate-1", affiliate_application_id: "application-1" },
    });
    expect(state.insertedMessages[0]).toMatchObject({
      sender_user_id: "user-affiliate-1",
      visibility: "customer",
      delivery_status: "not_applicable",
    });
    expect(state.updates).toContainEqual({ table: "support_handoffs", payload: { conversation_id: "conversation-new", status: "open" } });
    expect(await response.json()).not.toHaveProperty("messages");
  });

  it("reuses an open conversation, reopens it for staff, and marks the new message unread", async () => {
    state.existingConversation = { id: "conversation-open" };
    const response = await POST(request({ subject: "One more thing", message: "Please check one more synthetic detail." }));
    expect(response.status).toBe(200);
    expect(state.insertedConversation).toBeNull();
    expect(state.insertedMessages[0]).toMatchObject({ conversation_id: "conversation-open", visibility: "customer" });
    expect(state.updates).toContainEqual(expect.objectContaining({
      table: "support_conversations",
      payload: expect.objectContaining({ inbox_status: "needs_reply", unread_for_staff: true, closed_at: null }),
    }));
  });
});

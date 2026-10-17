import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  existing: null as Record<string, unknown> | null,
  insertedConversation: null as Record<string, unknown> | null,
  insertedMessage: null as Record<string, unknown> | null,
  updates: [] as Array<Record<string, unknown>>,
  sends: [] as Array<Record<string, unknown>>,
}));

function query(table: string) {
  let operation = "select";
  let payload: Record<string, unknown> | null = null;
  // Supabase's fluent query builder is heavily overloaded; use a tiny dynamic mock here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    lt: () => builder,
    delete: () => builder,
    maybeSingle: async () => ({ data: table === "support_conversations" ? state.existing : null, error: null }),
    insert: (value: Record<string, unknown>) => {
      operation = "insert";
      payload = value;
      if (table === "support_conversations") state.insertedConversation = value;
      if (table === "support_messages") state.insertedMessage = value;
      return builder;
    },
    upsert: async () => ({ error: null }),
    single: async () => ({ data: { id: "conversation-1" }, error: null }),
    update: (value: Record<string, unknown>) => {
      operation = "update";
      payload = value;
      return builder;
    },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null, count: table === "contact_submission_attempts" && operation === "select" ? 0 : null, data: operation === "update" ? state.updates.push(payload ?? {}) : null }).then(resolve),
  };
  return builder;
}

vi.mock("@/lib/supabase-service-client", () => ({ createServiceClient: () => ({ from: query }) }));
vi.mock("@/lib/email", () => ({
  sendPlainEmail: vi.fn(async (payload: Record<string, unknown>) => {
    state.sends.push(payload);
    return { status: "failed" };
  }),
}));

import { POST } from "./route";

describe("public contact intake", () => {
  beforeEach(() => {
    state.existing = null;
    state.insertedConversation = null;
    state.insertedMessage = null;
    state.updates.length = 0;
    state.sends.length = 0;
  });

  it("persists an inquiry and exposes notification failure", async () => {
    const response = await POST(new Request("https://hannadvc.com/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.21" },
      body: JSON.stringify({ name: "Sample Visitor", email: "sample@example.test", audience: "guest", message: "I have a question about an upcoming stay." }),
    }));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ ok: true, acknowledgment: "failed", staffAlert: "failed" });
    expect(state.insertedConversation).toMatchObject({ inbox_source: "contact_form", inbox_status: "needs_reply" });
    expect(state.insertedMessage).toMatchObject({ visibility: "customer", sender: "guest" });
    expect(state.sends).toHaveLength(2);
    expect(state.sends[0]).toMatchObject({ replyTo: "hello@hannadvc.com", metadata: { inbox_email_threading: true } });
    expect(state.updates).toContainEqual({ contact_ack_status: "failed", contact_staff_alert_status: "failed", updated_at: expect.any(String) });
  });

  it("does not send duplicate notifications for an existing matching inquiry", async () => {
    state.existing = { id: "conversation-existing", contact_ack_status: "failed", contact_staff_alert_status: "failed" };
    const response = await POST(new Request("https://hannadvc.com/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.22" },
      body: JSON.stringify({ name: "Sample Visitor", email: "sample@example.test", audience: "guest", message: "I have a question about an upcoming stay." }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, duplicate: true });
    expect(state.sends).toHaveLength(0);
  });
});

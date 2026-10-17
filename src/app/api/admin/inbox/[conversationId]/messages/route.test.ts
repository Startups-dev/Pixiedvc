import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  inserted: [] as Array<Record<string, unknown>>,
  updates: [] as Array<{ table: string; value: Record<string, unknown> }>,
  emailStatus: "sent" as "sent" | "failed",
  emailCalls: 0,
  twilioCalls: 0,
  guestEmail: "sample@example.test" as string | null,
  twilioSid: null as string | null,
  twilioFails: false,
}));

function makeClient() {
  // Supabase's fluent query builder is heavily overloaded; use a tiny dynamic mock here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({
      data: builder.table === "support_conversations"
        ? { id: "conversation-1", guest_email: state.guestEmail, guest_name: "Sample Visitor", twilio_conversation_sid: state.twilioSid, inbox_status: "needs_reply", handoff: null }
        : { nickname: "Staff" },
      error: null,
    }),
    insert: (value: Record<string, unknown>) => {
      state.inserted.push(value);
      return builder;
    },
    single: async () => ({ data: { id: "message-1" }, error: null }),
    update: (value: Record<string, unknown>) => {
      state.updates.push({ table: builder.table, value });
      return builder;
    },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
  };
  return {
    from(table: string) {
      builder.table = table;
      return builder;
    },
  };
}

vi.mock("@/lib/admin-inbox-auth", () => ({
  getAdminInboxContext: async () => ({ ok: true, user: { id: "staff-1", email: "staff@example.test" }, client: makeClient() }),
}));
vi.mock("@/lib/email", () => ({
  sendPlainEmail: vi.fn(async () => {
    state.emailCalls += 1;
    return { status: state.emailStatus };
  }),
}));
vi.mock("@/lib/twilio-conversations", () => ({
  sendTwilioMessage: vi.fn(async () => {
    state.twilioCalls += 1;
    if (state.twilioFails) throw new Error("simulated Twilio failure");
  }),
}));

import { POST } from "./route";

const params = { params: Promise.resolve({ conversationId: "conversation-1" }) };
function request(mode: "reply" | "internal_note") {
  return new Request("https://hannadvc.com/api/admin/inbox/conversation-1/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode, content: "A sample message for the thread." }),
  });
}

describe("Inbox message delivery", () => {
  beforeEach(() => {
    state.inserted.length = 0;
    state.updates.length = 0;
    state.emailStatus = "sent";
    state.emailCalls = 0;
    state.twilioCalls = 0;
    state.guestEmail = "sample@example.test";
    state.twilioSid = null;
    state.twilioFails = false;
  });

  it("stores internal notes without calling a customer transport", async () => {
    const response = await POST(request("internal_note"), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, kind: "internal_note", deliveryStatus: "not_applicable" });
    expect(state.inserted[0]).toMatchObject({ visibility: "internal", delivery_status: "not_applicable" });
    expect(state.emailCalls).toBe(0);
    expect(state.twilioCalls).toBe(0);
  });

  it("reports only provider-accepted email replies as sent", async () => {
    state.emailStatus = "failed";
    const failed = await POST(request("reply"), params);
    expect(failed.status).toBe(502);
    expect(await failed.json()).toMatchObject({ ok: false, error: "email_provider_rejected", deliveryStatus: "failed" });
    expect(state.inserted.at(-1)).toMatchObject({ visibility: "customer", delivery_status: "pending" });
    expect(state.updates.some((update) => update.table === "support_messages" && update.value.delivery_status === "failed")).toBe(true);

    state.emailStatus = "sent";
    const sent = await POST(request("reply"), params);
    expect(sent.status).toBe(200);
    expect(await sent.json()).toMatchObject({ ok: true, channel: "email", deliveryStatus: "sent" });
    expect(state.emailCalls).toBe(2);
  });

  it("reports Twilio failures and refuses replies when no channel exists", async () => {
    state.guestEmail = null;
    state.twilioSid = "CH-test";
    state.twilioFails = true;
    const failed = await POST(request("reply"), params);
    expect(failed.status).toBe(502);
    expect(await failed.json()).toMatchObject({ ok: false, error: "twilio_delivery_failed", deliveryStatus: "failed" });
    expect(state.emailCalls).toBe(0);

    state.twilioSid = null;
    const unavailable = await POST(request("reply"), params);
    expect(unavailable.status).toBe(409);
    expect(await unavailable.json()).toMatchObject({ ok: false, error: "NO_CUSTOMER_REPLY_CHANNEL" });
    expect(state.twilioCalls).toBe(1);
  });
});

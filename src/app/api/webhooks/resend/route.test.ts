import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  outbound: { related_entity_type: "support_conversation", related_entity_id: "conversation-1", metadata: { support_message_id: "message-1", inbox_email_threading: true } } as Record<string, unknown> | null,
  links: [] as Array<Record<string, unknown>>,
  rpcCalls: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
}));

type TestBuilder = {
  select: () => TestBuilder;
  eq: (...args: unknown[]) => TestBuilder;
  upsert: (value: Record<string, unknown>) => Promise<{ error: null }>;
  update: (value: Record<string, unknown>) => TestBuilder;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
  then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(table: string): TestBuilder {
  const builder: TestBuilder = {
    select: () => builder,
    eq: () => builder,
    upsert: (value: Record<string, unknown>) => {
      if (table === "support_email_message_links") state.links.push(value);
      return Promise.resolve({ error: null });
    },
    update: (value: Record<string, unknown>) => {
      state.updates.push(value);
      return builder;
    },
    maybeSingle: async () => ({ data: table === "outbound_emails" ? state.outbound : null, error: null }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
  };
  return builder;
}

vi.mock("@/lib/supabase-service-client", () => ({ createServiceClient: () => ({
  from: (table: string) => makeBuilder(table),
  rpc: (name: string, args: Record<string, unknown>) => { state.rpcCalls.push({ name, ...args }); return Promise.resolve({ error: null }); },
}) }));

import { POST } from "./route";

const secretBytes = Buffer.from("test-resend-webhook-secret");
const signingSecret = `whsec_${secretBytes.toString("base64")}`;
function signedRequest(body: string, id = "evt_1", timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secretBytes).update(`${id}.${timestamp}.${body}`).digest("base64");
  return new Request("https://hannadvc.com/api/webhooks/resend", {
    method: "POST",
    headers: { "svix-id": id, "svix-timestamp": String(timestamp), "svix-signature": `v1,${signature}` },
    body,
  });
}

describe("Resend Message-ID webhook", () => {
  beforeEach(() => {
    process.env.RESEND_WEBHOOK_SIGNING_SECRET = signingSecret;
    state.outbound = { related_entity_type: "support_conversation", related_entity_id: "conversation-1", metadata: { support_message_id: "message-1", inbox_email_threading: true } };
    state.links.length = 0;
    state.rpcCalls.length = 0;
    state.updates.length = 0;
  });

  it("rejects unsigned events and stores exact outbound thread identifiers", async () => {
    const rejected = await POST(new Request("https://hannadvc.com/api/webhooks/resend", { method: "POST", body: "{}" }));
    expect(rejected.status).toBe(401);

    const body = JSON.stringify({ type: "email.sent", data: { email_id: "re_1", message_id: "<mail-1@example.test>" } });
    const accepted = await POST(signedRequest(body));
    expect(accepted.status).toBe(200);
    expect(state.links[0]).toMatchObject({ provider: "resend", provider_message_id: "re_1", rfc_message_id: "<mail-1@example.test>", conversation_id: "conversation-1", support_message_id: "message-1" });
    expect(state.rpcCalls[0]).toMatchObject({ name: "link_resend_support_email", p_rfc_message_id: "<mail-1@example.test>", p_conversation_id: "conversation-1" });
  });

  it("asks Resend to retry when the outbound log has not yet persisted", async () => {
    state.outbound = null;
    const body = JSON.stringify({ type: "email.sent", data: { email_id: "re_2", message_id: "<mail-2@example.test>" } });
    const response = await POST(signedRequest(body, "evt_2"));
    expect(response.status).toBe(503);
    expect(state.links).toHaveLength(0);
  });

  it("records confirmed recipient delivery separately from provider acceptance", async () => {
    const body = JSON.stringify({ type: "email.delivered", data: { email_id: "re_delivered" } });
    const response = await POST(signedRequest(body, "evt_delivered"));
    expect(response.status).toBe(200);
    expect(state.updates).toContainEqual({ provider_delivery_status: "delivered" });
    expect(state.links).toHaveLength(0);
  });
});

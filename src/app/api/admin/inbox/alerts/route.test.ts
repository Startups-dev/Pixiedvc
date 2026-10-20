import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const state = vi.hoisted(() => ({
  auth: { ok: true, user: { id: "staff-1" }, client: null as unknown },
  messages: [] as Array<Record<string, unknown>>,
  links: [] as Array<Record<string, unknown>>,
  unreadCount: 2,
}));

function query(data: unknown[], table: string) {
  const result = { data, count: table === "support_conversations" ? state.unreadCount : null, error: null };
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "or", "not", "order", "limit", "in"]) {
    builder[method] = () => builder;
  }
  builder.then = (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

const tableData = vi.hoisted(() => ({ currentTable: "" }));

vi.mock("@/lib/admin-inbox-auth", () => ({
  getAdminInboxContext: vi.fn(async () => state.auth.ok
    ? state.auth
    : { ok: false, response: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: state.auth.user ? 403 : 401 }) }),
}));

import { GET } from "@/app/api/admin/inbox/alerts/route";

function request(queryString = "") {
  return new Request(`https://hannadvc.com/api/admin/inbox/alerts${queryString}`);
}

describe("GET /api/admin/inbox/alerts", () => {
  beforeEach(() => {
    state.auth = {
      ok: true,
      user: { id: "staff-1" },
      client: { from(table: string) {
        tableData.currentTable = table;
        return query(table === "support_conversations" ? [] : table === "support_messages" ? state.messages : state.links, table);
      } },
    };
    state.messages = [];
    state.links = [];
    state.unreadCount = 2;
  });

  it("requires an authorized staff session", async () => {
    state.auth = { ok: false, user: null, client: null } as unknown as typeof state.auth;
    const response = await GET(request());
    expect(response.status).toBe(401);
  });

  it("returns the unread badge but suppresses all events during the initial baseline", async () => {
    state.messages = [{ id: "old", conversation_id: "conversation-1", sender_type: "guest", created_at: "2026-10-20T10:00:00Z" }];
    const response = await GET(request("?baseline=1"));
    const payload = await response.json();
    expect(payload.unreadCount).toBe(2);
    expect(payload.events).toEqual([]);
    expect(payload.cursor).toBeTruthy();
  });

  it("alerts on guest replies and Zoho imports while excluding staff, private notes, history, and duplicates", async () => {
    state.messages = [
      { id: "guest-reply", conversation_id: "c1", sender_type: "guest", visibility: "customer", created_at: "2026-10-20T10:00:01Z", message: "private body must not be returned" },
      { id: "zoho-reply", conversation_id: "c2", sender_type: "guest", visibility: "customer", created_at: "2026-10-20T10:00:01Z" },
      { id: "staff-reply", conversation_id: "c1", sender_type: "agent", visibility: "customer", created_at: "2026-10-20T10:00:02Z" },
      { id: "internal-note", conversation_id: "c1", sender_type: "guest", visibility: "internal", created_at: "2026-10-20T10:00:03Z" },
      { id: "historical", conversation_id: "c1", sender_type: "guest", metadata: { historical_import: true }, created_at: "2026-10-20T10:00:04Z" },
      { id: "historical-zoho", conversation_id: "c2", sender_type: "guest", visibility: "customer", metadata: { import_type: "historical" }, created_at: "2026-10-20T10:00:04Z" },
    ];
    state.links = [
      { provider: "zoho", direction: "inbound", support_message_id: "zoho-reply", conversation_id: "c2", created_at: "2026-10-20T10:00:05Z" },
      { provider: "zoho", direction: "inbound", support_message_id: "historical-zoho", conversation_id: "c2", created_at: "2026-10-20T10:00:05Z" },
      { provider: "zoho", direction: "inbound", support_message_id: "guest-reply", conversation_id: "c1", created_at: "2026-10-20T10:00:06Z" },
      { provider: "resend", direction: "outbound", support_message_id: "outbound", conversation_id: "c2", created_at: "2026-10-20T10:00:07Z" },
    ];
    const response = await GET(request("?after=2026-10-20T10:00:00.000Z"));
    const payload = await response.json();
    expect(payload.events.map((event: { id: string }) => event.id)).toEqual(["guest-reply", "zoho-reply"]);
    expect(JSON.stringify(payload)).not.toContain("private body");
  });

  it("rejects an invalid cursor", async () => {
    const response = await GET(request("?after=not-a-date"));
    expect(response.status).toBe(400);
  });
});

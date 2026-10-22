import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getAdminInboxContext: vi.fn() }));
vi.mock("@/lib/admin-inbox-auth", () => ({ getAdminInboxContext: mocks.getAdminInboxContext }));

import { GET, PATCH } from "./route";

describe("Admin Inbox SMS settings authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies unauthenticated settings reads and writes before any database access", async () => {
    const denied = { ok: false, response: Response.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 }) };
    mocks.getAdminInboxContext.mockResolvedValue(denied);
    const read = await GET();
    const write = await PATCH(new Request("https://hannadvc.com/api/admin/inbox/sms/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: true }),
    }));
    expect(read.status).toBe(401);
    expect(write.status).toBe(401);
    expect(mocks.getAdminInboxContext).toHaveBeenCalledTimes(2);
  });
});

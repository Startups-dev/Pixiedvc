import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getAdminInboxContext: vi.fn(), sendAdminInboxSms: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/admin-inbox-auth", () => ({ getAdminInboxContext: mocks.getAdminInboxContext }));
vi.mock("@/lib/admin-inbox-sms", () => ({
  createSmsVerificationCode: vi.fn(() => "123456"),
  encryptSmsPhone: vi.fn(() => "synthetic-ciphertext"),
  getSmsConfiguration: vi.fn(() => ({ ready: true, missing: [] })),
  hashSmsVerificationCode: vi.fn(() => "synthetic-hash"),
  normalizeE164Phone: (value: unknown) => typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value) ? value : null,
  sendAdminInboxSms: mocks.sendAdminInboxSms,
}));

import { POST } from "./route";

describe("Admin Inbox SMS phone verification start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminInboxContext.mockResolvedValue({
      ok: true,
      user: { id: "synthetic-staff" },
      client: { rpc: mocks.rpc, from: mocks.from },
    });
  });

  it("enforces the atomic database attempt limit before sending", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const response = await POST(new Request("https://hannadvc.com/api/admin/inbox/sms/verify/start", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+14165550100" }),
    }));
    expect(response.status).toBe(429);
    expect(mocks.rpc).toHaveBeenCalledWith("reserve_admin_inbox_sms_verification", expect.objectContaining({ p_user_id: "synthetic-staff" }));
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.sendAdminInboxSms).not.toHaveBeenCalled();
  });

  it("requires authorized staff before verification or database writes", async () => {
    mocks.getAdminInboxContext.mockResolvedValue({ ok: false, response: Response.json({ ok: false }, { status: 401 }) });
    const response = await POST(new Request("https://hannadvc.com/api/admin/inbox/sms/verify/start", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+14165550100" }),
    }));
    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.sendAdminInboxSms).not.toHaveBeenCalled();
  });
});

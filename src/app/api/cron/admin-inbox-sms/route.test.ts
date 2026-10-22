import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verifyGoogleServiceAccountToken: vi.fn(), runAdminInboxSmsEscalations: vi.fn() }));
vi.mock("@/lib/cloud-scheduler-auth", () => ({ verifyGoogleServiceAccountToken: mocks.verifyGoogleServiceAccountToken }));
vi.mock("@/lib/admin-inbox-sms-dispatch", () => ({ runAdminInboxSmsEscalations: mocks.runAdminInboxSmsEscalations }));

import { POST } from "./route";

describe("scheduled Admin Inbox SMS worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyGoogleServiceAccountToken.mockResolvedValue(true);
    mocks.runAdminInboxSmsEscalations.mockResolvedValue({ queuedScanned: 2, sentAccepted: 1, failed: 0, deferred: 1 });
  });

  it("rejects unauthenticated calls without starting the worker", async () => {
    const response = await POST(new Request("https://hannadvc.com/api/cron/admin-inbox-sms", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mocks.verifyGoogleServiceAccountToken).not.toHaveBeenCalled();
    expect(mocks.runAdminInboxSmsEscalations).not.toHaveBeenCalled();
  });

  it("accepts only the existing scheduler identity and the SMS endpoint audience", async () => {
    const response = await POST(new Request("https://hannadvc.com/api/cron/admin-inbox-sms", {
      method: "POST", headers: { Authorization: "Bearer synthetic.jwt.token" },
    }));
    expect(response.status).toBe(200);
    expect(mocks.verifyGoogleServiceAccountToken).toHaveBeenCalledWith(
      "synthetic.jwt.token",
      "https://hannadvc.com/api/cron/admin-inbox-sms",
      "hanna-zoho-reconcile@pixiedvc-production.iam.gserviceaccount.com",
    );
    expect(mocks.runAdminInboxSmsEscalations).toHaveBeenCalledOnce();
  });

  it("reports safe worker failures", async () => {
    mocks.runAdminInboxSmsEscalations.mockRejectedValue(new Error("database internals and customer data"));
    const response = await POST(new Request("https://hannadvc.com/api/cron/admin-inbox-sms", {
      method: "POST", headers: { Authorization: "Bearer synthetic.jwt.token" },
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "SMS_ESCALATION_WORKER_FAILED" });
  });
});

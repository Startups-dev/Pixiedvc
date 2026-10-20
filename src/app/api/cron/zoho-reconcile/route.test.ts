import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verifyGoogleServiceAccountToken: vi.fn(), runZohoReconciliation: vi.fn(), recordZohoReconciliationError: vi.fn() }));

vi.mock("@/lib/cloud-scheduler-auth", () => ({ verifyGoogleServiceAccountToken: mocks.verifyGoogleServiceAccountToken }));
vi.mock("@/lib/zoho-mail-reconciliation", () => ({
  runZohoReconciliation: mocks.runZohoReconciliation,
  recordZohoReconciliationError: mocks.recordZohoReconciliationError,
}));

import { POST } from "./route";

describe("scheduled Zoho reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyGoogleServiceAccountToken.mockResolvedValue(true);
    mocks.runZohoReconciliation.mockResolvedValue({ scanned: 1, imported: 1, duplicates: 0, pageLimitReached: false });
    mocks.recordZohoReconciliationError.mockResolvedValue("zoho_reconciliation_failed");
  });

  it("rejects requests without a bearer token", async () => {
    const response = await POST(new Request("https://hannadvc.com/api/cron/zoho-reconcile", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mocks.verifyGoogleServiceAccountToken).not.toHaveBeenCalled();
    expect(mocks.runZohoReconciliation).not.toHaveBeenCalled();
  });

  it("only runs after the scheduler service identity is verified", async () => {
    const response = await POST(new Request("https://hannadvc.com/api/cron/zoho-reconcile", {
      method: "POST", headers: { Authorization: "Bearer synthetic.jwt.token" },
    }));
    expect(response.status).toBe(200);
    expect(mocks.verifyGoogleServiceAccountToken).toHaveBeenCalledWith(
      "synthetic.jwt.token",
      "https://hannadvc.com/api/cron/zoho-reconcile",
      "hanna-zoho-reconcile@pixiedvc-production.iam.gserviceaccount.com",
    );
    expect(mocks.runZohoReconciliation).toHaveBeenCalledOnce();
  });

  it("returns retryable failure without leaking provider payloads", async () => {
    mocks.runZohoReconciliation.mockRejectedValue(new Error("ZOHO_MESSAGE_IMPORT_FAILED_23514"));
    mocks.recordZohoReconciliationError.mockResolvedValue("zoho_message_import_failed_23514");
    const response = await POST(new Request("https://hannadvc.com/api/cron/zoho-reconcile", {
      method: "POST", headers: { Authorization: "Bearer synthetic.jwt.token" },
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "zoho_message_import_failed_23514" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getAdminInboxContext: vi.fn(), runZohoReconciliation: vi.fn(), recordZohoReconciliationError: vi.fn() }));

vi.mock("@/lib/admin-inbox-auth", () => ({ getAdminInboxContext: mocks.getAdminInboxContext }));
vi.mock("@/lib/zoho-mail-reconciliation", () => ({
  runZohoReconciliation: mocks.runZohoReconciliation,
  recordZohoReconciliationError: mocks.recordZohoReconciliationError,
}));

import { POST } from "./route";

describe("admin Zoho reconciliation endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminInboxContext.mockResolvedValue({ ok: true });
    mocks.runZohoReconciliation.mockResolvedValue({ scanned: 10, imported: 1, duplicates: 9, pageLimitReached: true });
    mocks.recordZohoReconciliationError.mockResolvedValue("zoho_reconciliation_failed");
  });

  it("keeps manual reconciliation behind staff authorization", async () => {
    mocks.getAdminInboxContext.mockResolvedValue({ ok: false, response: Response.json({ ok: false }, { status: 401 }) });
    const response = await POST();
    expect(response.status).toBe(401);
    expect(mocks.runZohoReconciliation).not.toHaveBeenCalled();
  });

  it("uses the same bounded importer and lock for manual reconciliation", async () => {
    const response = await POST();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, scanned: 10, imported: 1, pageLimitReached: true });
    expect(mocks.runZohoReconciliation).toHaveBeenCalledOnce();
  });

  it("returns a safe provider error without exposing message data", async () => {
    mocks.runZohoReconciliation.mockRejectedValue(new Error("ZOHO_API_HTTP_429"));
    mocks.recordZohoReconciliationError.mockResolvedValue("zoho_api_http_429");
    const response = await POST();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "zoho_api_http_429" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminInboxContext: vi.fn(),
  finishZohoReconciliation: vi.fn(),
  getZohoAccessToken: vi.fn(),
  getZohoConnection: vi.fn(),
  importZohoMessage: vi.fn(),
  setConnectionErrorCode: vi.fn(),
  zohoApi: vi.fn(),
}));

vi.mock("@/lib/admin-inbox-auth", () => ({ getAdminInboxContext: mocks.getAdminInboxContext }));
vi.mock("@/lib/zoho-mail-inbox", () => ({
  finishZohoReconciliation: mocks.finishZohoReconciliation,
  getZohoAccessToken: mocks.getZohoAccessToken,
  getZohoConnection: mocks.getZohoConnection,
  importZohoMessage: mocks.importZohoMessage,
  setConnectionErrorCode: mocks.setConnectionErrorCode,
  zohoApi: mocks.zohoApi,
}));

import { POST } from "./route";

describe("Zoho reconciliation retry behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminInboxContext.mockResolvedValue({ ok: true });
    mocks.setConnectionErrorCode.mockResolvedValue(undefined);
    mocks.finishZohoReconciliation.mockResolvedValue(undefined);
    mocks.getZohoConnection.mockResolvedValue({
      zoho_account_id: "synthetic-account",
      zoho_inbox_folder_id: "synthetic-inbox",
      import_started_at: "2026-10-17T00:00:00.000Z",
      reconcile_start: 1,
    });
    mocks.getZohoAccessToken.mockResolvedValue("synthetic-token");
    mocks.zohoApi.mockResolvedValue([{
      messageId: "synthetic-message",
      folderId: "synthetic-inbox",
      receivedTime: "1792280000000",
      threadId: "synthetic-thread",
      fromAddress: "sender@example.test",
      subject: "Synthetic subject",
    }]);
  });

  it("does not advance the cursor after a message import fails, so the same page can retry", async () => {
    mocks.importZohoMessage
      .mockRejectedValueOnce(new Error("ZOHO_MESSAGE_MISSING_SENDER_OR_BODY"))
      .mockResolvedValueOnce({ duplicate: false, ignored: false });

    const failed = await POST();
    expect(failed.status).toBe(503);
    expect(mocks.finishZohoReconciliation).not.toHaveBeenCalled();
    expect(mocks.setConnectionErrorCode).toHaveBeenCalledWith("zoho_message_missing_sender_or_body");

    const retried = await POST();
    expect(retried.status).toBe(200);
    expect(mocks.importZohoMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({
      messageId: "synthetic-message",
      threadId: "synthetic-thread",
      fromAddress: "sender@example.test",
      subject: "Synthetic subject",
    }));
    expect(mocks.finishZohoReconciliation).toHaveBeenCalledOnce();
  });
});

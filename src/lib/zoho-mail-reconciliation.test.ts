import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ lockExists: false, pageRows: [] as Array<Record<string, unknown>>, cursor: 1 }));
const mocks = vi.hoisted(() => ({
  getZohoConnection: vi.fn(), getZohoAccessToken: vi.fn(), importZohoMessage: vi.fn(),
  finishZohoReconciliation: vi.fn(), setConnectionErrorCode: vi.fn(), zohoApi: vi.fn(),
}));

function fakeQuery() {
  let operation = "";
  let reclaim = false;
  const builder: Record<string, unknown> = {};
  builder.insert = () => { operation = "insert"; return builder; };
  builder.update = () => { operation = "update"; return builder; };
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.lte = () => { reclaim = true; return builder; };
  builder.maybeSingle = async () => {
    if (operation === "insert") {
      if (state.lockExists) return { data: null, error: { code: "23505" } };
      state.lockExists = true;
      return { data: { name: "zoho-mail-reconciliation" }, error: null };
    }
    if (reclaim && state.lockExists) return { data: null, error: null };
    if (reclaim) state.lockExists = true;
    return { data: reclaim ? { name: "zoho-mail-reconciliation" } : null, error: null };
  };
  builder.then = (resolve: (value: { error: null }) => unknown, reject?: (reason: unknown) => unknown) => {
    if (operation === "update" && !reclaim) state.lockExists = false;
    return Promise.resolve({ error: null }).then(resolve, reject);
  };
  return builder;
}

vi.mock("@/lib/supabase-service-client", () => ({ createServiceClient: () => ({ from: () => fakeQuery() }) }));
vi.mock("@/lib/zoho-mail-inbox", () => ({
  getZohoConnection: mocks.getZohoConnection,
  getZohoAccessToken: mocks.getZohoAccessToken,
  importZohoMessage: mocks.importZohoMessage,
  finishZohoReconciliation: mocks.finishZohoReconciliation,
  setConnectionErrorCode: mocks.setConnectionErrorCode,
  zohoApi: mocks.zohoApi,
}));

import { recordZohoReconciliationError, runZohoReconciliation } from "@/lib/zoho-mail-reconciliation";

describe("bounded Zoho reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.lockExists = false;
    state.cursor = 1;
    state.pageRows = [{ messageId: "synthetic-message", folderId: "inbox", receivedTime: "1792280000000", threadId: "synthetic-thread" }];
    mocks.getZohoConnection.mockResolvedValue({
      zoho_account_id: "synthetic-account", zoho_inbox_folder_id: "inbox",
      import_started_at: "2026-10-17T00:00:00.000Z", reconcile_start: state.cursor,
    });
    mocks.getZohoAccessToken.mockResolvedValue("synthetic-access-token");
    mocks.zohoApi.mockImplementation(async () => state.pageRows);
    mocks.importZohoMessage.mockResolvedValue({ duplicate: false });
    mocks.finishZohoReconciliation.mockImplementation(async (cursor: number) => { state.cursor = cursor; });
    mocks.setConnectionErrorCode.mockResolvedValue(undefined);
  });

  it("keeps the same cursor after a failed import and retries through the same importer", async () => {
    mocks.importZohoMessage.mockRejectedValueOnce(new Error("ZOHO_API_HTTP_429"));
    await expect(runZohoReconciliation()).rejects.toThrow("ZOHO_API_HTTP_429");
    expect(mocks.finishZohoReconciliation).not.toHaveBeenCalled();
    expect(state.cursor).toBe(1);

    const result = await runZohoReconciliation();
    expect(result).toMatchObject({ scanned: 1, imported: 1 });
    expect(mocks.zohoApi).toHaveBeenCalledTimes(2);
    expect(mocks.zohoApi.mock.calls[0][0]).toContain("start=1");
    expect(mocks.zohoApi.mock.calls[1][0]).toContain("start=1");
    expect(mocks.importZohoMessage).toHaveBeenLastCalledWith(expect.objectContaining({ messageId: "synthetic-message" }));
    expect(state.cursor).toBe(1);
  });

  it("caps each provider list request and skips an overlapping run", async () => {
    state.lockExists = true;
    expect(await runZohoReconciliation()).toEqual({ skipped: "already_running" });
    expect(mocks.getZohoConnection).not.toHaveBeenCalled();
    state.lockExists = false;
    await runZohoReconciliation();
    expect(mocks.zohoApi.mock.calls[0][0]).toContain("limit=10");
  });

  it("resets to the connection cutoff rather than scanning historical mail", async () => {
    state.pageRows = [{ messageId: "pre-connection", folderId: "inbox", receivedTime: "1760000000000" }];
    const result = await runZohoReconciliation();
    expect(result).toMatchObject({ scanned: 0, imported: 0 });
    expect(mocks.importZohoMessage).not.toHaveBeenCalled();
    expect(mocks.finishZohoReconciliation).toHaveBeenCalledWith(1, null);
  });

  it("stores only sanitized provider failure codes for operator diagnostics", async () => {
    await expect(recordZohoReconciliationError(new Error("ZOHO_MESSAGE_IMPORT_FAILED_23514"))).resolves.toBe("zoho_message_import_failed_23514");
    expect(mocks.setConnectionErrorCode).toHaveBeenCalledWith("zoho_message_import_failed_23514");
    await expect(recordZohoReconciliationError(new Error("private body text"))).resolves.toBe("zoho_reconciliation_failed");
  });
});

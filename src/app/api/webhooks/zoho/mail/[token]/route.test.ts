import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  savedSecret: null as string | null,
  savedSecrets: [] as string[],
  imported: [] as Array<Record<string, unknown>>,
  recorded: [] as Array<Record<string, unknown>>,
  importFailure: null as string | null,
}));

vi.mock("@/lib/supabase-service-client", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: state.savedSecret ? { webhook_secret_ciphertext: "encrypted" } : null, error: null }) }),
      }),
    }),
  }),
}));

vi.mock("@/lib/zoho-mail-inbox", () => ({
  decryptSecret: () => state.savedSecret,
  importZohoMessage: async (message: Record<string, unknown>) => {
    state.imported.push(message);
    if (state.importFailure) throw new Error(state.importFailure);
    return { ignored: false };
  },
  recordZohoEvent: async (event: Record<string, unknown>) => { state.recorded.push(event); },
  saveZohoWebhookSecret: async (secret: string) => { state.savedSecret = secret; state.savedSecrets.push(secret); },
  setZohoConnectionError: async () => undefined,
  verifyZohoWebhook: (body: Buffer, signature: string | null, secret: string) => signature === `valid:${secret}:${body.toString("utf8")}`,
  webhookPathToken: () => "test-path-token-long-enough-for-route",
}));

import { POST } from "./route";

const pathToken = "test-path-token-long-enough-for-route";

function post(body: string, headers: Record<string, string> = {}, token = pathToken) {
  return POST(new Request(`https://hannadvc.com/api/webhooks/zoho/mail/${token}`, {
    method: "POST",
    headers,
    body,
  }), { params: Promise.resolve({ token }) });
}

describe("Zoho Mail webhook setup validation", () => {
  beforeEach(() => {
    state.savedSecret = null;
    state.savedSecrets.length = 0;
    state.imported.length = 0;
    state.recorded.length = 0;
    state.importFailure = null;
  });

  it("acknowledges a token-protected setup probe, saves its first secret, and never imports it", async () => {
    const body = JSON.stringify({ event: "validation" });
    const response = await post(body, { "x-hook-secret": "first-hook-secret" });

    expect(response.status).toBe(200);
    expect(state.savedSecrets).toEqual(["first-hook-secret"]);
    expect(state.imported).toHaveLength(0);
    expect(state.recorded).toHaveLength(0);
  });

  it("acknowledges the first unsigned mail payload as a handshake without importing it", async () => {
    const body = JSON.stringify({ messageId: "mail-1", folderId: "inbox" });
    const response = await post(body, { "x-hook-secret": "first-hook-secret" });

    expect(response.status).toBe(200);
    expect(state.savedSecrets).toEqual(["first-hook-secret"]);
    expect(state.imported).toHaveLength(0);
    expect(state.recorded).toHaveLength(0);
  });

  it("rejects subsequent unsigned mail events after the handshake", async () => {
    state.savedSecret = "stored-event-secret";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const body = JSON.stringify({ messageId: "mail-1", folderId: "inbox" });
    const response = await post(body, { "x-hook-secret": "stored-event-secret" });

    expect(response.status).toBe(401);
    expect(state.savedSecrets).toHaveLength(0);
    expect(state.imported).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith("Zoho webhook signature rejected", expect.objectContaining({
      signaturePresent: false,
      candidateSecretPresent: true,
      savedSecretPresent: true,
      savedSignatureValid: false,
      candidateSignatureValid: false,
      bodyIsJson: true,
      hasMessageIdField: true,
      hasFolderIdField: true,
    }));
    expect(JSON.stringify(warn.mock.calls)).not.toContain("stored-event-secret");
    warn.mockRestore();
  });

  it("rejects an invalid signature on the first mail payload", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await post(JSON.stringify({ messageId: "mail-1", folderId: "inbox" }), {
      "x-hook-secret": "first-hook-secret",
      "x-hook-signature": "invalid",
    });

    expect(response.status).toBe(401);
    expect(state.savedSecrets).toHaveLength(0);
    expect(state.imported).toHaveLength(0);
    warn.mockRestore();
  });

  it("requires the path token even for setup probes", async () => {
    const response = await post(JSON.stringify({ event: "validation" }), { "x-hook-secret": "first-hook-secret" }, "wrong-token");
    expect(response.status).toBe(404);
    expect(state.savedSecrets).toHaveLength(0);
  });

  it("continues to verify signed mail events before importing them", async () => {
    state.savedSecret = "stored-event-secret";
    const body = JSON.stringify({ messageId: "mail-2", folderId: "inbox", receivedTime: 1000 });
    const response = await post(body, {
      "x-hook-signature": `valid:stored-event-secret:${body}`,
    });

    expect(response.status).toBe(200);
    expect(state.imported).toEqual([{ messageId: "mail-2", folderId: "inbox", receivedTime: 1000 }]);
    expect(state.recorded).toHaveLength(1);
    expect(state.savedSecrets).toHaveLength(0);
  });

  it("records a safe provider failure code and leaves the failed import retryable", async () => {
    state.savedSecret = "stored-event-secret";
    state.importFailure = "ZOHO_API_HTTP_429";
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const body = JSON.stringify({ messageId: "mail-retry", folderId: "inbox", receivedTime: 1000 });
    const response = await post(body, { "x-hook-signature": `valid:stored-event-secret:${body}` });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "ZOHO_API_HTTP_429" });
    expect(state.recorded.at(-1)).toMatchObject({ status: "failed", errorCode: "ZOHO_API_HTTP_429" });
    expect(errorLog).toHaveBeenCalledWith("Zoho webhook import failed", { failureCode: "ZOHO_API_HTTP_429" });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("mail-retry");
    errorLog.mockRestore();
  });
});

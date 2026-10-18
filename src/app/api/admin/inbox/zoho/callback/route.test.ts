import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ savedState: "valid-state" }));
const mocks = vi.hoisted(() => ({
  getAdminInboxContext: vi.fn(),
  getZohoOAuthConfig: vi.fn(),
  saveZohoTokens: vi.fn(),
  zohoApi: vi.fn(),
  getZohoPublicAppOrigin: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: state.savedState }), delete: vi.fn() }),
}));
vi.mock("@/lib/admin-inbox-auth", () => ({ getAdminInboxContext: mocks.getAdminInboxContext }));
vi.mock("@/lib/zoho-mail-inbox", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/zoho-mail-inbox")>(),
  getZohoOAuthConfig: mocks.getZohoOAuthConfig,
  saveZohoTokens: mocks.saveZohoTokens,
  zohoApi: mocks.zohoApi,
}));
vi.mock("@/lib/app-url", () => ({ getZohoPublicAppOrigin: mocks.getZohoPublicAppOrigin }));

import { GET } from "@/app/api/admin/inbox/zoho/callback/route";

describe("Zoho OAuth callback redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.savedState = "valid-state";
    mocks.getAdminInboxContext.mockResolvedValue({ ok: true, user: { id: "synthetic-staff" } });
    mocks.getZohoPublicAppOrigin.mockReturnValue("https://hannadvc.com");
    mocks.getZohoOAuthConfig.mockReturnValue({
      clientId: "synthetic-client-id", clientSecret: "synthetic-client-secret",
      accountsApi: "https://accounts.zohocloud.ca/oauth/v2", mailbox: "hello@hannadvc.com",
    });
    mocks.saveZohoTokens.mockResolvedValue(undefined);
  });

  it("redirects callback errors to the public origin, never the request host", async () => {
    const response = await GET(new Request("http://0.0.0.0:8080/api/admin/inbox/zoho/callback?state=bad&code=test"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://hannadvc.com/admin/inbox?zoho_error=ZOHO_OAUTH_STATE_INVALID");
  });

  it("matches Zoho's account response and redirects success to the public origin", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: "synthetic-access", refresh_token: "synthetic-refresh", expires_in: 3600 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    mocks.zohoApi
      .mockResolvedValueOnce([{
        accountId: "synthetic-account",
        primaryEmailAddress: "primary@example.test",
        emailAddress: [
          { mailId: "primary@example.test", isAlias: false, isPrimary: true },
          { mailId: "hello@hannadvc.com", isAlias: true, isPrimary: false },
        ],
      }])
      .mockResolvedValueOnce([{ folderName: "Inbox", folderId: "synthetic-inbox" }]);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = await GET(new Request("http://0.0.0.0:8080/api/admin/inbox/zoho/callback?state=valid-state&code=synthetic-code"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://hannadvc.com/admin/inbox?zoho_connected=1");
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain("redirect_uri=https%3A%2F%2Fhannadvc.com%2Fapi%2Fadmin%2Finbox%2Fzoho%2Fcallback");
    expect(mocks.saveZohoTokens).toHaveBeenCalledWith(expect.objectContaining({ accountId: "synthetic-account", inboxFolderId: "synthetic-inbox" }));
    expect(JSON.stringify(info.mock.calls)).not.toContain("hello@hannadvc.com");
    info.mockRestore();
    vi.unstubAllGlobals();
  });
});

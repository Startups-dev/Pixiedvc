import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminInboxContext } from "@/lib/admin-inbox-auth";
import { getZohoOAuthConfig, saveZohoTokens, zohoApi } from "@/lib/zoho-mail-inbox";
import { getAppBaseUrl } from "@/lib/app-url";

type ZohoRow = Record<string, unknown>;
function rows(data: unknown): ZohoRow[] {
  if (Array.isArray(data)) return data as ZohoRow[];
  if (data && typeof data === "object") {
    for (const value of Object.values(data)) if (Array.isArray(value)) return value as ZohoRow[];
  }
  return [];
}

export async function GET(request: Request) {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const jar = await cookies();
  const state = url.searchParams.get("state");
  const savedState = jar.get("zoho_mail_oauth_state")?.value;
  const redirect = (code: string) => {
    const response = NextResponse.redirect(new URL(`/admin/inbox?zoho_error=${encodeURIComponent(code)}`, request.url));
    response.cookies.delete("zoho_mail_oauth_state");
    return response;
  };
  if (!state || !savedState || state !== savedState) return redirect("ZOHO_OAUTH_STATE_INVALID");
  const code = url.searchParams.get("code");
  if (!code) return redirect("ZOHO_OAUTH_AUTHORIZATION_FAILED");

  try {
    const { clientId, clientSecret, accountsApi, mailbox } = getZohoOAuthConfig();
    const baseUrl = getAppBaseUrl();
    if (!process.env.ZOHO_MAIL_REDIRECT_URI && !baseUrl) return redirect("APP_BASE_URL_NOT_CONFIGURED");
    const redirectUri = process.env.ZOHO_MAIL_REDIRECT_URI || `${baseUrl}/api/admin/inbox/zoho/callback`;
    const tokenResponse = await fetch(`${accountsApi}/token`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }),
      cache: "no-store",
    });
    const token = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || typeof token?.access_token !== "string" || typeof token?.refresh_token !== "string") return redirect("ZOHO_OAUTH_TOKEN_EXCHANGE_FAILED");

    const accounts = rows(await zohoApi<unknown>("/accounts", token.access_token));
    const account = accounts.find((item) => String(item.emailAddress ?? item.primaryEmailAddress ?? item.email ?? "").toLowerCase() === mailbox);
    const accountId = account?.accountId ?? account?.accountid ?? account?.id;
    if (!accountId) return redirect("ZOHO_TARGET_MAILBOX_NOT_FOUND");
    const folders = rows(await zohoApi<unknown>(`/accounts/${encodeURIComponent(String(accountId))}/folders`, token.access_token));
    const inbox = folders.find((item) => String(item.folderType ?? item.folderName ?? item.name ?? "").toLowerCase() === "inbox");
    const inboxFolderId = inbox?.folderId ?? inbox?.folderid ?? inbox?.id;
    if (!inboxFolderId) return redirect("ZOHO_INBOX_FOLDER_NOT_FOUND");

    await saveZohoTokens({
      accessToken: token.access_token, refreshToken: token.refresh_token,
      expiresIn: Number(token.expires_in ?? 3600), accountId: String(accountId), inboxFolderId: String(inboxFolderId),
    });
    const response = NextResponse.redirect(new URL("/admin/inbox?zoho_connected=1", baseUrl ?? new URL(request.url).origin));
    response.cookies.delete("zoho_mail_oauth_state");
    return response;
  } catch {
    return redirect("ZOHO_CONNECTION_SETUP_FAILED");
  }
}

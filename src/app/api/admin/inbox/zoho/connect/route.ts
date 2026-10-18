import { NextResponse } from "next/server";
import { getAdminInboxContext } from "@/lib/admin-inbox-auth";
import { getZohoOAuthConfig } from "@/lib/zoho-mail-inbox";
import { getZohoPublicAppOrigin } from "@/lib/app-url";

export async function GET() {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  try {
    const { clientId } = getZohoOAuthConfig();
    const publicOrigin = getZohoPublicAppOrigin();
    if (!publicOrigin) throw new Error("APP_BASE_URL_NOT_CONFIGURED");
    const redirectUri = `${publicOrigin}/api/admin/inbox/zoho/callback`;
    const state = crypto.randomUUID();
    const authorize = new URL("https://accounts.zohocloud.ca/oauth/v2/auth");
    authorize.search = new URLSearchParams({
      scope: "ZohoMail.accounts.READ,ZohoMail.folders.READ,ZohoMail.messages.READ",
      client_id: clientId,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      redirect_uri: redirectUri,
      state,
    }).toString();
    const response = NextResponse.redirect(authorize);
    response.cookies.set("zoho_mail_oauth_state", state, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/inbox/zoho", maxAge: 600,
    });
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : "ZOHO_OAUTH_CONFIGURATION_MISSING";
    const baseUrl = getZohoPublicAppOrigin() ?? "https://hannadvc.com";
    return NextResponse.redirect(new URL(`/admin/inbox?zoho_error=${encodeURIComponent(code)}`, baseUrl));
  }
}

import { NextResponse } from "next/server";
import { getAdminInboxContext } from "@/lib/admin-inbox-auth";
import { getZohoConnection, webhookPathToken } from "@/lib/zoho-mail-inbox";
import { createServiceClient } from "@/lib/supabase-service-client";
import { getAppBaseUrl } from "@/lib/app-url";

export async function GET() {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  try {
    const connection = await getZohoConnection();
    let webhookUrl: string | null = null;
    if (connection?.refresh_token_ciphertext) {
      try {
        const token = webhookPathToken();
        const base = getAppBaseUrl();
        if (base) webhookUrl = `${base}/api/webhooks/zoho/mail/${token}`;
      } catch { /* report configuration status without exposing a partial URL */ }
    }
    const db = createServiceClient();
    const [failed, recent] = await Promise.all([
      db.from("support_email_webhook_events").select("id", { count: "exact", head: true }).eq("status", "failed"),
      db.from("support_email_webhook_events").select("provider, event_type, status, error_code, created_at").eq("status", "failed").order("created_at", { ascending: false }).limit(5),
    ]);
    return NextResponse.json({
      ok: true,
      configured: Boolean(process.env.ZOHO_MAIL_CLIENT_ID && process.env.ZOHO_MAIL_CLIENT_SECRET && process.env.ZOHO_MAIL_ENCRYPTION_KEY && process.env.ZOHO_MAIL_WEBHOOK_TOKEN),
      connected: Boolean(connection?.refresh_token_ciphertext),
      mailbox: "hello@hannadvc.com",
      dataCenter: "Canada",
      webhookUrl,
      connectedAt: connection?.connected_at ?? null,
      importStartedAt: connection?.import_started_at ?? null,
      lastWebhookAt: connection?.last_webhook_at ?? null,
      lastReconciledAt: connection?.last_reconciled_at ?? null,
      lastError: connection?.last_error ?? null,
      failedImportCount: failed.count ?? 0,
      recentFailures: recent.data ?? [],
      resendWebhookConfigured: Boolean(process.env.RESEND_WEBHOOK_SIGNING_SECRET),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "ZOHO_STATUS_UNAVAILABLE" }, { status: 503 });
  }
}

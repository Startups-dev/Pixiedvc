import { NextResponse } from "next/server";
import { getAdminInboxContext } from "@/lib/admin-inbox-auth";
import { finishZohoReconciliation, getZohoAccessToken, getZohoConnection, importZohoMessage, setConnectionErrorCode, zohoApi } from "@/lib/zoho-mail-inbox";

type MailRow = { messageId?: string | number; folderId?: string | number; threadId?: string | number; receivedTime?: string | number };

export async function POST() {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  try {
    const connection = await getZohoConnection();
    if (!connection?.zoho_account_id || !connection.zoho_inbox_folder_id || !connection.import_started_at) {
      return NextResponse.json({ ok: false, error: "ZOHO_NOT_CONNECTED" }, { status: 409 });
    }
    const token = await getZohoAccessToken();
    const cutoff = Date.parse(connection.import_started_at);
    const initialStart = Math.max(1, Number(connection.reconcile_start ?? 1));
    const imported = new Set<string>();
    const duplicates = new Set<string>();
    let scanned = 0;
    let reachedCutoff = false;
    const pageSize = 200;
    const maxPages = 3;

    for (let page = 0; page < maxPages; page += 1) {
      const start = initialStart + page * pageSize;
      const query = new URLSearchParams({
        folderId: connection.zoho_inbox_folder_id,
        start: String(start), limit: String(pageSize), sortBy: "date", sortorder: "false",
        includesent: "false", includeto: "true", threadedMails: "false",
      });
      const data = await zohoApi<MailRow[] | { data?: MailRow[] }>(
        `/accounts/${encodeURIComponent(connection.zoho_account_id)}/messages/view?${query.toString()}`, token,
      );
      const rows = Array.isArray(data) ? data : data.data ?? [];
      scanned += rows.length;
      if (!rows.length) { reachedCutoff = true; break; }
      for (const row of rows) {
        if (!row.messageId || !row.folderId || !row.receivedTime) throw new Error("ZOHO_RECONCILE_ROW_INVALID");
        const received = Number(row.receivedTime);
        if (!Number.isFinite(received)) throw new Error("ZOHO_RECONCILE_ROW_INVALID");
        if (received < cutoff) { reachedCutoff = true; break; }
        const result = await importZohoMessage({
          messageId: String(row.messageId), folderId: String(row.folderId),
          threadId: row.threadId ? String(row.threadId) : undefined, receivedTime: received,
        });
        if (result.duplicate) duplicates.add(String(row.messageId));
        else if (!result.ignored) imported.add(String(row.messageId));
      }
      if (reachedCutoff) break;
      if (rows.length < pageSize) { reachedCutoff = true; break; }
    }
    const pageLimitReached = scanned >= pageSize * maxPages && !reachedCutoff;
    const nextStart = reachedCutoff ? 1 : initialStart + scanned;
    await finishZohoReconciliation(nextStart, pageLimitReached ? "reconcile_page_limit_reached" : null);
    return NextResponse.json({ ok: true, scanned, imported: imported.size, duplicates: duplicates.size, pageLimitReached });
  } catch (error) {
    const code = error instanceof Error && /^ZOHO_[A-Z0-9_]+$/.test(error.message) ? error.message.toLowerCase() : "zoho_reconciliation_failed";
    await setConnectionErrorCode(code).catch(() => undefined);
    return NextResponse.json({ ok: false, error: code }, { status: 503 });
  }
}

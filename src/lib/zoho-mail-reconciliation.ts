import { createServiceClient } from "@/lib/supabase-service-client";
import { finishZohoReconciliation, getZohoAccessToken, getZohoConnection, importZohoMessage, setConnectionErrorCode, zohoApi } from "@/lib/zoho-mail-inbox";

type MailRow = { messageId?: string | number; folderId?: string | number; threadId?: string | number; receivedTime?: string | number; fromAddress?: string; subject?: string };
const LOCK_NAME = "zoho-mail-reconciliation";
const LOCK_DURATION_MS = 10 * 60 * 1000;
const PAGE_SIZE = 10;

async function acquireLock() {
  const db = createServiceClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS).toISOString();
  const inserted = await db.from("cron_locks").insert({ name: LOCK_NAME, locked_until: lockedUntil }).select("name").maybeSingle();
  if (!inserted.error && inserted.data) return lockedUntil;
  if (inserted.error?.code !== "23505") throw new Error("ZOHO_RECONCILE_LOCK_FAILED");

  const reclaimed = await db.from("cron_locks")
    .update({ locked_until: lockedUntil })
    .eq("name", LOCK_NAME)
    .lte("locked_until", nowIso)
    .select("name")
    .maybeSingle();
  if (reclaimed.error) throw new Error("ZOHO_RECONCILE_LOCK_FAILED");
  return reclaimed.data ? lockedUntil : null;
}

async function releaseLock(lockedUntil: string) {
  const db = createServiceClient();
  await db.from("cron_locks")
    .update({ locked_until: new Date(0).toISOString() })
    .eq("name", LOCK_NAME)
    .eq("locked_until", lockedUntil);
}

export type ZohoReconciliationResult = {
  skipped?: "already_running";
  notConnected?: true;
  scanned?: number;
  imported?: number;
  duplicates?: number;
  pageLimitReached?: boolean;
};

export async function runZohoReconciliation(): Promise<ZohoReconciliationResult> {
  const lockedUntil = await acquireLock();
  if (!lockedUntil) return { skipped: "already_running" };
  try {
    const connection = await getZohoConnection();
    if (!connection?.zoho_account_id || !connection.zoho_inbox_folder_id || !connection.import_started_at) {
      return { notConnected: true };
    }
    const token = await getZohoAccessToken();
    const cutoff = Date.parse(connection.import_started_at);
    const start = Math.max(1, Number(connection.reconcile_start ?? 1));
    const query = new URLSearchParams({
      folderId: connection.zoho_inbox_folder_id,
      start: String(start), limit: String(PAGE_SIZE), sortBy: "date", sortorder: "false",
      includesent: "false", includeto: "true", threadedMails: "false",
    });
    const data = await zohoApi<MailRow[] | { data?: MailRow[] }>(
      `/accounts/${encodeURIComponent(connection.zoho_account_id)}/messages/view?${query.toString()}`, token,
    );
    const rows = Array.isArray(data) ? data : data.data ?? [];
    const imported = new Set<string>();
    const duplicates = new Set<string>();
    let scanned = 0;
    let reachedCutoff = rows.length === 0;

    for (const row of rows) {
      if (!row.messageId || !row.folderId || !row.receivedTime) throw new Error("ZOHO_RECONCILE_ROW_INVALID");
      const received = Number(row.receivedTime);
      if (!Number.isFinite(received)) throw new Error("ZOHO_RECONCILE_ROW_INVALID");
      if (received < cutoff) { reachedCutoff = true; break; }
      scanned += 1;
      const result = await importZohoMessage({
        messageId: String(row.messageId), folderId: String(row.folderId),
        threadId: row.threadId ? String(row.threadId) : undefined, receivedTime: received,
        fromAddress: row.fromAddress, subject: row.subject,
      });
      if (result.duplicate) duplicates.add(String(row.messageId));
      else if (!result.ignored) imported.add(String(row.messageId));
    }

    const exhaustedPage = rows.length < PAGE_SIZE;
    const pageLimitReached = rows.length === PAGE_SIZE && !reachedCutoff;
    const nextStart = reachedCutoff || exhaustedPage ? 1 : start + scanned;
    await finishZohoReconciliation(nextStart, pageLimitReached ? "reconcile_page_limit_reached" : null);
    return { scanned, imported: imported.size, duplicates: duplicates.size, pageLimitReached };
  } finally {
    await releaseLock(lockedUntil).catch(() => undefined);
  }
}

export async function recordZohoReconciliationError(error: unknown) {
  const code = error instanceof Error && /^ZOHO_[A-Z0-9_]+$/.test(error.message)
    ? error.message.toLowerCase()
    : "zoho_reconciliation_failed";
  await setConnectionErrorCode(code).catch(() => undefined);
  return code;
}

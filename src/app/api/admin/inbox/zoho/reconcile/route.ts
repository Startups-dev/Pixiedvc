import { NextResponse } from "next/server";
import { getAdminInboxContext } from "@/lib/admin-inbox-auth";
import { recordZohoReconciliationError, runZohoReconciliation } from "@/lib/zoho-mail-reconciliation";

export async function POST() {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  try {
    const result = await runZohoReconciliation();
    return NextResponse.json({ ok: true, ...result }, { status: result.skipped ? 202 : 200 });
  } catch (error) {
    const code = await recordZohoReconciliationError(error);
    return NextResponse.json({ ok: false, error: code }, { status: 503 });
  }
}

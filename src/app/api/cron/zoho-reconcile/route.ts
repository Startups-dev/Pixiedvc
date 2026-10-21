import { NextResponse } from "next/server";
import { verifyGoogleServiceAccountToken } from "@/lib/cloud-scheduler-auth";
import { recordZohoReconciliationError, runZohoReconciliation } from "@/lib/zoho-mail-reconciliation";

export const dynamic = "force-dynamic";

const AUDIENCE = "https://hannadvc.com/api/cron/zoho-reconcile";
const SCHEDULER_SERVICE_ACCOUNT = "hanna-zoho-reconcile@pixiedvc-production.iam.gserviceaccount.com";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const valid = await verifyGoogleServiceAccountToken(match[1], AUDIENCE, SCHEDULER_SERVICE_ACCOUNT);
    if (!valid) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  } catch (error) {
    if (error instanceof Error && error.message === "GOOGLE_JWKS_UNAVAILABLE") {
      return NextResponse.json({ ok: false, error: "AUTH_VERIFICATION_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const result = await runZohoReconciliation();
    console.info("Zoho scheduled reconciliation completed", {
      skipped: result.skipped ?? null,
      notConnected: result.notConnected ?? false,
      scanned: result.scanned ?? 0,
      imported: result.imported ?? 0,
      duplicates: result.duplicates ?? 0,
      pageLimitReached: result.pageLimitReached ?? false,
    });
    return NextResponse.json({ ok: true, ...result }, { status: result.skipped ? 202 : 200 });
  } catch (error) {
    const code = await recordZohoReconciliationError(error);
    console.error("Zoho scheduled reconciliation failed", { code });
    return NextResponse.json({ ok: false, error: code }, { status: 503 });
  }
}

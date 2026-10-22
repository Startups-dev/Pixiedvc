import { NextResponse } from "next/server";
import { verifyGoogleServiceAccountToken } from "@/lib/cloud-scheduler-auth";
import { runAdminInboxSmsEscalations } from "@/lib/admin-inbox-sms-dispatch";

export const dynamic = "force-dynamic";

const AUDIENCE = "https://hannadvc.com/api/cron/admin-inbox-sms";
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
    const result = await runAdminInboxSmsEscalations();
    console.info("Admin Inbox SMS escalation worker completed", result);
    return NextResponse.json({ ok: true, ...result }, { status: result.skipped ? 202 : 200 });
  } catch {
    console.error("Admin Inbox SMS escalation worker failed", { error: "sms_escalation_worker_failed" });
    return NextResponse.json({ ok: false, error: "SMS_ESCALATION_WORKER_FAILED" }, { status: 503 });
  }
}

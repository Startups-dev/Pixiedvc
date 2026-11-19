import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runReadyStaySubmissionEmails } from "@/lib/ready-stays/submission-notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const actual = request.headers.get("authorization") ?? "";
  const token = `Bearer ${expected}`;
  if (!expected || Buffer.byteLength(actual) !== Buffer.byteLength(token) ||
      !timingSafeEqual(Buffer.from(actual), Buffer.from(token))) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const result = await runReadyStaySubmissionEmails();
    console.info("Ready Stay submission email worker completed", result);
    return NextResponse.json({ ok: true, ...result }, { status: result.failed || result.preparationFailed || result.needsReview ? 503 : 200 });
  } catch {
    console.error("Ready Stay submission email worker failed");
    return NextResponse.json({ ok: false, error: "SUBMISSION_EMAIL_WORKER_FAILED" }, { status: 503 });
  }
}

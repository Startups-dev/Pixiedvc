import { NextResponse } from "next/server";
import { getAdminInboxContext } from "@/lib/admin-inbox-auth";
import { compareSmsVerificationCode } from "@/lib/admin-inbox-sms";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const challengeId = typeof body?.challengeId === "string" ? body.challengeId : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "INVALID_VERIFICATION_CODE" }, { status: 400 });
  }

  const db = auth.client;
  const { data: challenge, error } = await db.from("admin_inbox_sms_verifications")
    .select("id, phone_ciphertext, phone_last4, code_hash, status, attempts, expires_at")
    .eq("id", challengeId).eq("user_id", auth.user.id).maybeSingle();
  if (error || !challenge) return NextResponse.json({ ok: false, error: "VERIFICATION_NOT_FOUND" }, { status: 404 });
  if (challenge.status !== "pending" || Date.parse(challenge.expires_at) <= Date.now()) {
    await db.from("admin_inbox_sms_verifications").update({ status: "expired", phone_ciphertext: "", code_hash: "" }).eq("id", challenge.id).eq("status", "pending");
    return NextResponse.json({ ok: false, error: "VERIFICATION_EXPIRED" }, { status: 410 });
  }
  if (challenge.attempts >= 5) {
    await db.from("admin_inbox_sms_verifications").update({ status: "failed", phone_ciphertext: "", code_hash: "" }).eq("id", challenge.id).eq("status", "pending");
    return NextResponse.json({ ok: false, error: "VERIFICATION_ATTEMPTS_EXHAUSTED" }, { status: 429 });
  }

  const correct = compareSmsVerificationCode(challenge.code_hash, code, challenge.id);
  const nextAttempts = challenge.attempts + 1;
  if (!correct) {
    const { data: updated } = await db.from("admin_inbox_sms_verifications").update({
      attempts: nextAttempts, status: nextAttempts >= 5 ? "failed" : "pending",
      ...(nextAttempts >= 5 ? { phone_ciphertext: "", code_hash: "" } : {}),
    }).eq("id", challenge.id).eq("user_id", auth.user.id).eq("status", "pending").eq("attempts", challenge.attempts).select("id").maybeSingle();
    if (!updated) return NextResponse.json({ ok: false, error: "VERIFICATION_ATTEMPT_CONFLICT" }, { status: 409 });
    return NextResponse.json({ ok: false, error: nextAttempts >= 5 ? "VERIFICATION_ATTEMPTS_EXHAUSTED" : "VERIFICATION_CODE_INCORRECT", attemptsRemaining: Math.max(0, 5 - nextAttempts) }, { status: nextAttempts >= 5 ? 429 : 400 });
  }

  const verifiedAt = new Date().toISOString();
  const { data: marked } = await db.from("admin_inbox_sms_verifications").update({
    status: "verified", attempts: nextAttempts, verified_at: verifiedAt, phone_ciphertext: "", code_hash: "",
  }).eq("id", challenge.id).eq("user_id", auth.user.id).eq("status", "pending").eq("attempts", challenge.attempts).gt("expires_at", verifiedAt).select("id").maybeSingle();
  if (!marked) return NextResponse.json({ ok: false, error: "VERIFICATION_ATTEMPT_CONFLICT" }, { status: 409 });

  const { error: preferencesError } = await db.from("admin_inbox_sms_preferences").upsert({
    user_id: auth.user.id,
    phone_ciphertext: challenge.phone_ciphertext,
    phone_last4: challenge.phone_last4,
    phone_verified_at: verifiedAt,
    opted_in: false,
    enabled: false,
    reservation_opted_in: false,
    reservation_enabled: false,
    updated_at: verifiedAt,
  }, { onConflict: "user_id" });
  if (preferencesError) {
    await db.from("admin_inbox_sms_verifications").update({ status: "failed", phone_ciphertext: "", code_hash: "" }).eq("id", challenge.id).eq("status", "verified");
    return NextResponse.json({ ok: false, error: "PHONE_VERIFICATION_SAVE_FAILED" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, phoneLast4: challenge.phone_last4 });
}

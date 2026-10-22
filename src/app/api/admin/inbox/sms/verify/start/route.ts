import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminInboxContext } from "@/lib/admin-inbox-auth";
import { applyStoredTwilioSmsCallbacks } from "@/lib/admin-inbox-sms-delivery";
import {
  createSmsVerificationCode,
  encryptSmsPhone,
  getSmsConfiguration,
  hashSmsVerificationCode,
  normalizeE164Phone,
  sendAdminInboxSms,
} from "@/lib/admin-inbox-sms";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  const config = getSmsConfiguration();
  if (!config.ready) return NextResponse.json({ ok: false, error: "SMS_PROVIDER_NOT_CONFIGURED" }, { status: 503 });

  const body = await request.json().catch(() => null);
  const phone = normalizeE164Phone(body?.phone);
  if (!phone) return NextResponse.json({ ok: false, error: "PHONE_MUST_BE_E164" }, { status: 400 });

  const db = auth.client;
  const now = new Date();
  const { data: attemptAllowed, error: attemptError } = await db.rpc("reserve_admin_inbox_sms_verification", {
    p_user_id: auth.user.id,
    p_now: now.toISOString(),
  });
  if (attemptError) return NextResponse.json({ ok: false, error: "SMS_VERIFICATION_UNAVAILABLE" }, { status: 503 });
  if (!attemptAllowed) return NextResponse.json({ ok: false, error: "VERIFICATION_RATE_LIMITED" }, { status: 429 });

  await db.from("admin_inbox_sms_verifications").update({ status: "expired", phone_ciphertext: "", code_hash: "" })
    .eq("user_id", auth.user.id).eq("status", "pending");
  const challengeId = randomUUID();
  const code = createSmsVerificationCode();
  const phoneCiphertext = encryptSmsPhone(phone);
  const expiresAt = new Date(now.getTime() + 10 * 60_000).toISOString();
  const { error: challengeError } = await db.from("admin_inbox_sms_verifications").insert({
    id: challengeId,
    user_id: auth.user.id,
    phone_ciphertext: phoneCiphertext,
    phone_last4: phone.slice(-4),
    code_hash: hashSmsVerificationCode(code, challengeId),
    expires_at: expiresAt,
  });
  if (challengeError) return NextResponse.json({ ok: false, error: "SMS_VERIFICATION_UNAVAILABLE" }, { status: 503 });

  const { data: event, error: eventError } = await db.from("admin_inbox_sms_events").insert({
    event_key: `verification:${challengeId}`,
    event_type: "verification",
    recipient_user_id: auth.user.id,
    status: "sending",
    attempted_at: now.toISOString(),
  }).select("id").single();
  if (eventError || !event) return NextResponse.json({ ok: false, error: "SMS_VERIFICATION_UNAVAILABLE" }, { status: 503 });

  const { data: rateAllowed, error: rateError } = await db.rpc("reserve_admin_inbox_sms_send", {
    p_recipient_user_id: auth.user.id, p_event_id: event.id, p_now: now.toISOString(),
  });
  if (rateError || !rateAllowed) {
    await db.from("admin_inbox_sms_events").update({ status: "failed", error_code: rateError ? "rate_limit_check_unavailable" : "recipient_rate_limited" }).eq("id", event.id);
    await db.from("admin_inbox_sms_verifications").update({ status: "failed" }).eq("id", challengeId);
    return NextResponse.json({ ok: false, error: rateError ? "SMS_VERIFICATION_UNAVAILABLE" : "SMS_RATE_LIMITED" }, { status: rateError ? 503 : 429 });
  }

  const outcome = await sendAdminInboxSms(phone, `HannaDVC Inbox verification code: ${code}. It expires in 10 minutes.`);
  const eventUpdate = outcome.status === "accepted" || outcome.status === "delivered"
    ? { status: outcome.status, provider_message_sid: outcome.messageSid, provider_status: outcome.providerStatus, accepted_at: now.toISOString(), delivered_at: outcome.status === "delivered" ? now.toISOString() : null }
    : { status: outcome.status, error_code: outcome.errorCode };
  await db.from("admin_inbox_sms_events").update({ ...eventUpdate, updated_at: new Date().toISOString() }).eq("id", event.id);
  if (outcome.status === "accepted" || outcome.status === "delivered") await applyStoredTwilioSmsCallbacks(outcome.messageSid);
  if (outcome.status === "failed") await db.from("admin_inbox_sms_verifications")
    .update({ status: "failed", phone_ciphertext: "", code_hash: "" }).eq("id", challengeId);
  if (outcome.status === "failed") return NextResponse.json({ ok: false, error: "SMS_PROVIDER_REJECTED" }, { status: 502 });
  if (outcome.status === "unknown") return NextResponse.json({ ok: true, challengeId, expiresAt, deliveryStatus: "unknown" }, { status: 202 });

  return NextResponse.json({ ok: true, challengeId, expiresAt, deliveryStatus: outcome.status });
}

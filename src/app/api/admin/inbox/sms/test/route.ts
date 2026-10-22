import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminInboxContext } from "@/lib/admin-inbox-auth";
import { applyStoredTwilioSmsCallbacks } from "@/lib/admin-inbox-sms-delivery";
import { decryptSmsPhone, getSmsConfiguration, sendAdminInboxSms } from "@/lib/admin-inbox-sms";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  const db = auth.client;
  const { data: settings, error } = await db.from("admin_inbox_sms_preferences").select("phone_ciphertext, phone_verified_at, opted_in, enabled")
    .eq("user_id", auth.user.id).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: "SMS_SETTINGS_UNAVAILABLE" }, { status: 503 });
  if (!settings?.phone_ciphertext || !settings.phone_verified_at || !settings.opted_in || !settings.enabled) {
    return NextResponse.json({ ok: false, error: "SMS_NOT_ENABLED_FOR_THIS_ACCOUNT" }, { status: 409 });
  }
  if (!getSmsConfiguration().ready) return NextResponse.json({ ok: false, error: "SMS_PROVIDER_NOT_CONFIGURED" }, { status: 503 });

  const now = new Date();
  const id = randomUUID();
  const { data: event, error: insertError } = await db.from("admin_inbox_sms_events").insert({
    id,
    event_key: `test:${auth.user.id}:${id}`,
    event_type: "test",
    recipient_user_id: auth.user.id,
    status: "sending",
    attempted_at: now.toISOString(),
  }).select("id").single();
  if (insertError || !event) return NextResponse.json({ ok: false, error: "SMS_TEST_COULD_NOT_START" }, { status: 503 });
  const { data: rateAllowed, error: rateError } = await db.rpc("reserve_admin_inbox_sms_send", {
    p_recipient_user_id: auth.user.id, p_event_id: event.id, p_now: now.toISOString(),
  });
  if (rateError || !rateAllowed) {
    await db.from("admin_inbox_sms_events").update({ status: "failed", error_code: rateError ? "rate_limit_check_unavailable" : "recipient_rate_limited" }).eq("id", event.id);
    return NextResponse.json({ ok: false, error: rateError ? "SMS_TEST_UNAVAILABLE" : "SMS_RATE_LIMITED" }, { status: rateError ? 503 : 429 });
  }

  let phone: string;
  try { phone = decryptSmsPhone(settings.phone_ciphertext); }
  catch {
    await db.from("admin_inbox_sms_events").update({ status: "failed", error_code: "sms_phone_decryption_failed" }).eq("id", event.id);
    return NextResponse.json({ ok: false, error: "SMS_TEST_UNAVAILABLE" }, { status: 503 });
  }
  const outcome = await sendAdminInboxSms(phone, "HannaDVC Inbox SMS test. Your alert settings are connected.");
  const update = outcome.status === "accepted" || outcome.status === "delivered"
    ? { status: outcome.status, provider_message_sid: outcome.messageSid, provider_status: outcome.providerStatus, accepted_at: now.toISOString(), delivered_at: outcome.status === "delivered" ? now.toISOString() : null }
    : { status: outcome.status, error_code: outcome.errorCode };
  await db.from("admin_inbox_sms_events").update({ ...update, updated_at: new Date().toISOString() }).eq("id", event.id);
  if (outcome.status === "accepted" || outcome.status === "delivered") await applyStoredTwilioSmsCallbacks(outcome.messageSid);
  if (outcome.status === "unknown") return NextResponse.json({ ok: false, error: "SMS_SEND_OUTCOME_UNKNOWN" }, { status: 503 });
  if (outcome.status === "failed") return NextResponse.json({ ok: false, error: "SMS_PROVIDER_REJECTED" }, { status: 502 });
  return NextResponse.json({ ok: true, deliveryStatus: outcome.status });
}

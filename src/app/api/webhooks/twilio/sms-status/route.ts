import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service-client";
import { smsStatusCallbackUrl, validateTwilioStatusSignature } from "@/lib/admin-inbox-sms";
import { applyStoredTwilioSmsCallbacks } from "@/lib/admin-inbox-sms-delivery";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const form = new URLSearchParams(rawBody);
  const params = Object.fromEntries(form.entries());
  const valid = validateTwilioStatusSignature(
    smsStatusCallbackUrl(), params, request.headers.get("x-twilio-signature"),
  );
  if (!valid) return new Response("Forbidden", { status: 403 });

  const messageSid = params.MessageSid;
  const providerStatus = params.MessageStatus ?? params.SmsStatus ?? "";
  if (!messageSid || !providerStatus || providerStatus.length > 40) return NextResponse.json({ ok: false, error: "INVALID_CALLBACK" }, { status: 400 });

  const db = createServiceClient();
  const callback = await db.from("admin_inbox_sms_callbacks").upsert({
    provider_message_sid: messageSid,
    provider_status: providerStatus,
    error_code: params.ErrorCode ? `twilio_${params.ErrorCode.replace(/[^A-Za-z0-9_]/g, "").slice(0, 30)}` : null,
  }, { onConflict: "provider_message_sid,provider_status", ignoreDuplicates: true });
  if (callback.error) return NextResponse.json({ ok: false, error: "SMS_CALLBACK_SAVE_FAILED" }, { status: 503 });
  const applied = await applyStoredTwilioSmsCallbacks(messageSid);
  if (applied.error) return NextResponse.json({ ok: false, error: "SMS_CALLBACK_SAVE_FAILED" }, { status: 503 });
  return NextResponse.json({ ok: true });
}

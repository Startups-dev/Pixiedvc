import { NextResponse } from "next/server";
import { getAdminInboxContext } from "@/lib/admin-inbox-auth";
import { getSmsConfiguration, type SmsPreferences } from "@/lib/admin-inbox-sms";
import { getCurrentUserAdminState } from "@/lib/admin";

export const dynamic = "force-dynamic";

const SETTINGS_FIELDS = "phone_last4, phone_verified_at, opted_in, enabled, reservation_opted_in, reservation_enabled, new_inquiry_enabled, assigned_reply_enabled, escalation_delay_minutes, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, time_zone";
const EDIT_FIELDS = "phone_last4, phone_verified_at, phone_ciphertext, opted_in, enabled, reservation_opted_in, reservation_enabled, new_inquiry_enabled, assigned_reply_enabled, escalation_delay_minutes, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, time_zone";

function validTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; }
}

function validClock(value: unknown) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function GET() {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.client.from("admin_inbox_sms_preferences")
    .select(SETTINGS_FIELDS).eq("user_id", auth.user.id).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: "SMS_SETTINGS_UNAVAILABLE" }, { status: 503 });
  return NextResponse.json({
    ok: true,
    configuration: getSmsConfiguration(),
    settings: data ? {
      phoneLast4: data.phone_last4,
      phoneVerified: Boolean(data.phone_verified_at),
      optedIn: Boolean(data.opted_in),
      enabled: Boolean(data.enabled),
      reservationOptedIn: Boolean(data.reservation_opted_in),
      reservationEnabled: Boolean(data.reservation_enabled),
      newInquiryEnabled: Boolean(data.new_inquiry_enabled),
      assignedReplyEnabled: Boolean(data.assigned_reply_enabled),
      escalationDelayMinutes: data.escalation_delay_minutes,
      quietHoursEnabled: Boolean(data.quiet_hours_enabled),
      quietHoursStart: data.quiet_hours_start?.slice(0, 5) ?? "22:00",
      quietHoursEnd: data.quiet_hours_end?.slice(0, 5) ?? "08:00",
      timeZone: data.time_zone,
    } : {
      phoneLast4: null, phoneVerified: false, optedIn: false, enabled: false, reservationOptedIn: false, reservationEnabled: false,
      newInquiryEnabled: true, assignedReplyEnabled: true, escalationDelayMinutes: 5,
      quietHoursEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "08:00", timeZone: "America/Toronto",
    },
  }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function PATCH(request: Request) {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "INVALID_SETTINGS" }, { status: 400 });

  const delay = Number(body.escalationDelayMinutes);
  const timeZone = body.timeZone ?? "America/Toronto";
  const quietStart = body.quietHoursStart ?? "22:00";
  const quietEnd = body.quietHoursEnd ?? "08:00";
  if (!Number.isInteger(delay) || delay < 1 || delay > 60 || !validTimeZone(timeZone) || !validClock(quietStart) || !validClock(quietEnd)) {
    return NextResponse.json({ ok: false, error: "INVALID_SETTINGS" }, { status: 400 });
  }

  const existingResult = await auth.client.from("admin_inbox_sms_preferences")
    .select(EDIT_FIELDS).eq("user_id", auth.user.id).maybeSingle();
  if (existingResult.error) return NextResponse.json({ ok: false, error: "SMS_SETTINGS_UNAVAILABLE" }, { status: 503 });
  const existing = existingResult.data as (SmsPreferences & { phone_last4: string | null; quiet_hours_start: string | null; quiet_hours_end: string | null }) | null;
  const optedIn = body.optedIn === true;
  const enabled = body.enabled === true;
  const reservationOptedIn = body.reservationOptedIn === undefined ? existing?.reservation_opted_in === true : body.reservationOptedIn === true;
  const reservationEnabled = body.reservationEnabled === undefined ? existing?.reservation_enabled === true : body.reservationEnabled === true;
  if ((reservationOptedIn || reservationEnabled) && !(await getCurrentUserAdminState()).isAdmin) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  if ((optedIn || enabled || reservationOptedIn || reservationEnabled) && (!existing?.phone_verified_at || !existing.phone_ciphertext)) {
    return NextResponse.json({ ok: false, error: "VERIFY_PHONE_FIRST" }, { status: 409 });
  }
  if ((optedIn || enabled || reservationOptedIn || reservationEnabled) && !getSmsConfiguration().ready) {
    return NextResponse.json({ ok: false, error: "SMS_PROVIDER_NOT_CONFIGURED" }, { status: 503 });
  }

  const values = {
    user_id: auth.user.id,
    opted_in: optedIn,
    enabled: optedIn && enabled,
    reservation_opted_in: reservationOptedIn,
    reservation_enabled: reservationOptedIn && reservationEnabled,
    new_inquiry_enabled: body.newInquiryEnabled !== false,
    assigned_reply_enabled: body.assignedReplyEnabled !== false,
    escalation_delay_minutes: delay,
    quiet_hours_enabled: body.quietHoursEnabled === true,
    quiet_hours_start: quietStart,
    quiet_hours_end: quietEnd,
    time_zone: timeZone,
    updated_at: new Date().toISOString(),
  };
  const { error } = await auth.client.from("admin_inbox_sms_preferences").upsert(values, { onConflict: "user_id" });
  if (error) return NextResponse.json({ ok: false, error: "SMS_SETTINGS_SAVE_FAILED" }, { status: 503 });

  if (!values.opted_in || !values.enabled) {
    await auth.client.from("admin_inbox_sms_events").update({ status: "cancelled", error_code: "recipient_disabled", updated_at: new Date().toISOString() })
      .eq("recipient_user_id", auth.user.id).eq("status", "queued").in("event_type", ["new_inquiry", "assigned_reply"]);
  } else if (existing) {
    const { data: queued } = await auth.client.from("admin_inbox_sms_events").select("id, source_message_id")
      .eq("recipient_user_id", auth.user.id).eq("status", "queued").in("event_type", ["new_inquiry", "assigned_reply"]);
    for (const event of queued ?? []) {
      if (!event.source_message_id) continue;
      const { data: message } = await auth.client.from("support_messages").select("created_at").eq("id", event.source_message_id).maybeSingle();
      if (message) await auth.client.from("admin_inbox_sms_events").update({
        due_at: new Date(Date.parse(message.created_at) + delay * 60_000).toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", event.id).eq("status", "queued");
    }
  }
  if (!values.reservation_opted_in || !values.reservation_enabled) {
    await auth.client.from("admin_inbox_sms_events").update({ status: "cancelled", error_code: "reservation_alerts_disabled", updated_at: new Date().toISOString() })
      .eq("recipient_user_id", auth.user.id).eq("status", "queued").eq("event_type", "reservation_request");
  }
  return NextResponse.json({ ok: true });
}

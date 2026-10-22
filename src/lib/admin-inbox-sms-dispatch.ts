import { isUserAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase-service-client";
import { applyStoredTwilioSmsCallbacks } from "@/lib/admin-inbox-sms-delivery";
import {
  buildInboxEscalationSms,
  decryptSmsPhone,
  getQuietHoursEnd,
  sendAdminInboxSms,
  type SmsPreferences,
} from "@/lib/admin-inbox-sms";

const LOCK_NAME = "admin-inbox-sms-escalation";
const LOCK_DURATION_MS = 10 * 60 * 1000;
const BATCH_SIZE = 10;

async function acquireLock() {
  const db = createServiceClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS).toISOString();
  const inserted = await db.from("cron_locks").insert({ name: LOCK_NAME, locked_until: lockedUntil }).select("name").maybeSingle();
  if (!inserted.error && inserted.data) return lockedUntil;
  if (inserted.error?.code !== "23505") throw new Error("SMS_ESCALATION_LOCK_FAILED");
  const reclaimed = await db.from("cron_locks").update({ locked_until: lockedUntil })
    .eq("name", LOCK_NAME).lte("locked_until", nowIso).select("name").maybeSingle();
  if (reclaimed.error) throw new Error("SMS_ESCALATION_LOCK_FAILED");
  return reclaimed.data ? lockedUntil : null;
}

async function releaseLock(lockedUntil: string) {
  const db = createServiceClient();
  await db.from("cron_locks").update({ locked_until: new Date(0).toISOString() })
    .eq("name", LOCK_NAME).eq("locked_until", lockedUntil);
}

async function isAuthorizedStaff(userId: string) {
  const db = createServiceClient();
  const [{ data: profile }, { data: supportAgent }, authUser] = await Promise.all([
    db.from("profiles").select("role, email").eq("id", userId).maybeSingle(),
    db.from("support_agents").select("role, active").eq("user_id", userId).maybeSingle(),
    db.auth.admin.getUserById(userId),
  ]);
  if (authUser.error || !authUser.data.user) return false;
  const user = authUser.data.user;
  const admin = isUserAdmin({
    profileRole: profile?.role ?? null,
    appRole: (user.app_metadata?.role as string | undefined) ?? null,
    email: user.email ?? profile?.email ?? null,
  });
  const activeAgent = Boolean(supportAgent?.active && ["admin", "agent"].includes(supportAgent.role ?? ""));
  return admin || activeAgent;
}

type SmsEvent = {
  id: string;
  event_type: "new_inquiry" | "assigned_reply";
  conversation_id: string | null;
  source_message_id: string | null;
  recipient_user_id: string;
  due_at: string;
};

export function evaluateSmsEscalation(input: {
  eventType: "new_inquiry" | "assigned_reply";
  recipientUserId: string;
  authorizedStaff: boolean;
  preferencesEnabled: boolean;
  phoneVerified: boolean;
  alertTypeEnabled: boolean;
  inboxStatus: string;
  assignedUserId: string | null;
  latestCustomerAt: string | null;
  latestDeliveredStaffReplyAt: string | null;
}) {
  if (!input.preferencesEnabled || !input.phoneVerified) return "preferences_disabled";
  if (!input.authorizedStaff) return "staff_no_longer_authorized";
  if (input.inboxStatus === "closed") return "conversation_closed";
  if (input.inboxStatus !== "needs_reply") return "conversation_no_longer_needs_reply";
  if (!input.latestCustomerAt) return "customer_message_missing";
  if (input.latestDeliveredStaffReplyAt && Date.parse(input.latestDeliveredStaffReplyAt) >= Date.parse(input.latestCustomerAt)) {
    return "customer_already_answered";
  }
  if (input.eventType === "new_inquiry" && input.assignedUserId) return "conversation_claimed";
  if (input.eventType === "assigned_reply" && input.assignedUserId !== input.recipientUserId) return "assignment_changed";
  if (!input.alertTypeEnabled) return input.eventType === "new_inquiry" ? "new_inquiry_disabled" : "assigned_reply_disabled";
  return null;
}

async function validateEvent(event: SmsEvent, preferences: SmsPreferences) {
  const db = createServiceClient();
  if (!event.conversation_id || !event.source_message_id) return "conversation_missing";
  if (!preferences.opted_in || !preferences.enabled || !preferences.phone_verified_at || !preferences.phone_ciphertext) return "preferences_disabled";
  if (!await isAuthorizedStaff(event.recipient_user_id)) return "staff_no_longer_authorized";

  const [{ data: conversation }, { data: sourceMessage }, { data: handoff }, { data: messages }] = await Promise.all([
    db.from("support_conversations").select("id, inbox_status, unread_for_staff").eq("id", event.conversation_id).maybeSingle(),
    db.from("support_messages").select("id, sender_type, sender, visibility, metadata, created_at").eq("id", event.source_message_id).maybeSingle(),
    db.from("support_handoffs").select("assigned_agent_user_id").eq("conversation_id", event.conversation_id).maybeSingle(),
    db.from("support_messages").select("sender_type, sender, visibility, delivery_status, created_at")
      .eq("conversation_id", event.conversation_id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (!conversation || !sourceMessage) return "conversation_missing";
  if ((sourceMessage.visibility ?? "customer") !== "customer" || (sourceMessage.sender_type ?? sourceMessage.sender) !== "guest") return "source_not_customer_message";
  const currentAssignment = handoff?.assigned_agent_user_id ?? null;

  const latestCustomer = (messages ?? []).find((message) =>
    (message.sender_type ?? message.sender) === "guest" && (message.visibility ?? "customer") === "customer",
  );
  const latestDeliveredStaffReply = (messages ?? []).find((message) =>
    (message.sender_type ?? message.sender) === "agent" && (message.visibility ?? "customer") === "customer" && message.delivery_status === "sent",
  );
  return evaluateSmsEscalation({
    eventType: event.event_type,
    recipientUserId: event.recipient_user_id,
    authorizedStaff: true,
    preferencesEnabled: Boolean(preferences.opted_in && preferences.enabled),
    phoneVerified: Boolean(preferences.phone_verified_at && preferences.phone_ciphertext),
    alertTypeEnabled: event.event_type === "assigned_reply" ? preferences.assigned_reply_enabled : preferences.new_inquiry_enabled,
    inboxStatus: conversation.inbox_status,
    assignedUserId: currentAssignment,
    latestCustomerAt: latestCustomer?.created_at ?? null,
    latestDeliveredStaffReplyAt: latestDeliveredStaffReply?.created_at ?? null,
  });
}

async function updateEvent(db: ReturnType<typeof createServiceClient>, id: string, values: Record<string, unknown>) {
  await db.from("admin_inbox_sms_events").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
}

export type SmsEscalationResult = { skipped?: "already_running"; queuedScanned: number; sentAccepted: number; failed: number; deferred: number };

export async function runAdminInboxSmsEscalations(now = new Date()): Promise<SmsEscalationResult> {
  const lockedUntil = await acquireLock();
  if (!lockedUntil) return { skipped: "already_running", queuedScanned: 0, sentAccepted: 0, failed: 0, deferred: 0 };
  const db = createServiceClient();
  const result: SmsEscalationResult = { queuedScanned: 0, sentAccepted: 0, failed: 0, deferred: 0 };
  try {
    await db.from("admin_inbox_sms_verifications").update({
      status: "expired", phone_ciphertext: "", code_hash: "",
    }).eq("status", "pending").lte("expires_at", now.toISOString());

    const { data: pendingCallbacks } = await db.from("admin_inbox_sms_callbacks")
      .select("provider_message_sid").is("applied_at", null).order("received_at", { ascending: true }).limit(100);
    for (const messageSid of new Set((pendingCallbacks ?? []).map((callback) => callback.provider_message_sid))) {
      await applyStoredTwilioSmsCallbacks(messageSid);
    }

    const staleSending = await db.from("admin_inbox_sms_events")
      .update({ status: "unknown", error_code: "worker_interrupted_outcome_unknown", updated_at: now.toISOString() })
      .eq("status", "sending").lt("updated_at", new Date(now.getTime() - 15 * 60_000).toISOString());
    if (staleSending.error) throw new Error("SMS_STALE_SEND_RECOVERY_FAILED");

    const { data: queued, error } = await db.from("admin_inbox_sms_events")
      .select("id, event_type, conversation_id, source_message_id, recipient_user_id, due_at")
      .in("event_type", ["new_inquiry", "assigned_reply"])
      .eq("status", "queued").lte("due_at", now.toISOString())
      .order("due_at", { ascending: true }).limit(BATCH_SIZE);
    if (error) throw new Error("SMS_QUEUE_READ_FAILED");

    for (const row of (queued ?? []) as SmsEvent[]) {
      result.queuedScanned += 1;
      const { data: claimed } = await db.from("admin_inbox_sms_events")
        .update({ status: "sending", attempted_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", row.id).eq("status", "queued").select("id").maybeSingle();
      if (!claimed) continue;

      const { data: preferences } = await db.from("admin_inbox_sms_preferences").select("*")
        .eq("user_id", row.recipient_user_id).maybeSingle();
      if (!preferences) {
        await updateEvent(db, row.id, { status: "cancelled", error_code: "sms_preferences_missing" });
        continue;
      }

      const invalidReason = await validateEvent(row, preferences as SmsPreferences);
      if (invalidReason) {
        await updateEvent(db, row.id, { status: "cancelled", error_code: invalidReason });
        continue;
      }

      const configuredDue = Date.parse(row.due_at);
      const preferredDue = row.source_message_id
        ? new Date(Math.max(Date.parse(row.due_at), Date.parse((await db.from("support_messages").select("created_at").eq("id", row.source_message_id).maybeSingle()).data?.created_at ?? row.due_at) + preferences.escalation_delay_minutes * 60_000))
        : new Date(configuredDue);
      if (now.getTime() < preferredDue.getTime()) {
        await updateEvent(db, row.id, { status: "queued", due_at: preferredDue.toISOString(), attempted_at: null, error_code: null });
        result.deferred += 1;
        continue;
      }

      const quietEnd = getQuietHoursEnd(now, preferences.quiet_hours_enabled, preferences.quiet_hours_start, preferences.quiet_hours_end, preferences.time_zone);
      if (quietEnd) {
        await updateEvent(db, row.id, { status: "queued", due_at: quietEnd.toISOString(), attempted_at: null, error_code: null });
        result.deferred += 1;
        continue;
      }

      const { data: rateAllowed, error: rateError } = await db.rpc("reserve_admin_inbox_sms_send", {
        p_recipient_user_id: row.recipient_user_id,
        p_event_id: row.id,
        p_now: now.toISOString(),
      });
      if (rateError) {
        await updateEvent(db, row.id, { status: "queued", due_at: new Date(now.getTime() + 60_000).toISOString(), attempted_at: null, error_code: "rate_limit_check_unavailable" });
        result.deferred += 1;
        continue;
      }
      if (!rateAllowed) {
        await updateEvent(db, row.id, { status: "queued", due_at: new Date(now.getTime() + 60_000).toISOString(), attempted_at: null, error_code: "recipient_rate_limited" });
        result.deferred += 1;
        continue;
      }

      let phone: string;
      try { phone = decryptSmsPhone(preferences.phone_ciphertext); }
      catch {
        await updateEvent(db, row.id, { status: "failed", error_code: "sms_phone_decryption_failed" });
        result.failed += 1;
        continue;
      }

      const outcome = await sendAdminInboxSms(phone, buildInboxEscalationSms(row.conversation_id!));
      if (outcome.status === "accepted" || outcome.status === "delivered") {
        await updateEvent(db, row.id, {
          status: outcome.status,
          provider_message_sid: outcome.messageSid,
          provider_status: outcome.providerStatus,
          accepted_at: now.toISOString(),
          delivered_at: outcome.status === "delivered" ? now.toISOString() : null,
          error_code: null,
        });
        await applyStoredTwilioSmsCallbacks(outcome.messageSid);
        result.sentAccepted += 1;
      } else {
        await updateEvent(db, row.id, { status: outcome.status, error_code: outcome.errorCode });
        result.failed += 1;
      }
    }
    return result;
  } finally {
    await releaseLock(lockedUntil).catch(() => undefined);
  }
}

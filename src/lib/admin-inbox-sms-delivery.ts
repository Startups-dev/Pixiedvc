import { createServiceClient } from "@/lib/supabase-service-client";
import { mapTwilioCallbackStatus } from "@/lib/admin-inbox-sms";

export async function applyStoredTwilioSmsCallbacks(messageSid: string) {
  const db = createServiceClient();
  const { data: event, error: eventError } = await db.from("admin_inbox_sms_events")
    .select("id, status").eq("provider_message_sid", messageSid).maybeSingle();
  if (eventError || !event) return { found: false, error: Boolean(eventError) };

  const { data: callbacks, error: callbackError } = await db.from("admin_inbox_sms_callbacks")
    .select("id, provider_status, error_code, received_at")
    .eq("provider_message_sid", messageSid).is("applied_at", null).order("received_at", { ascending: true });
  if (callbackError) return { found: true, error: true };

  let status = event.status;
  let providerStatus: string | null = null;
  let errorCode: string | null = null;
  let deliveredAt: string | null = null;
  for (const callback of callbacks ?? []) {
    const mapped = mapTwilioCallbackStatus(callback.provider_status);
    if (!mapped) continue;
    if (status === "delivered") continue;
    if (status === "failed" && mapped !== "delivered") continue;
    status = mapped;
    providerStatus = callback.provider_status;
    errorCode = mapped === "failed" ? callback.error_code : null;
    if (mapped === "delivered") deliveredAt = callback.received_at;
  }
  if (providerStatus) {
    const { error } = await db.from("admin_inbox_sms_events").update({
      status,
      provider_status: providerStatus,
      error_code: errorCode,
      ...(deliveredAt ? { delivered_at: deliveredAt } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", event.id);
    if (error) return { found: true, updated: false, error: true };
  }
  const callbackIds = (callbacks ?? []).map((callback) => callback.id);
  if (callbackIds.length) {
    const { error: markError } = await db.from("admin_inbox_sms_callbacks")
      .update({ applied_at: new Date().toISOString() }).in("id", callbackIds).is("applied_at", null);
    if (markError) return { found: true, updated: false, error: true };
  }
  return { found: true, updated: Boolean(providerStatus), error: false };
}

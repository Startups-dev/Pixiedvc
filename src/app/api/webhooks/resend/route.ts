import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service-client";
import { verifyResendWebhook } from "@/lib/zoho-mail-inbox";

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SIGNING_SECRET;
  if (!secret) return NextResponse.json({ ok: false }, { status: 503 });
  const rawBody = Buffer.from(await request.arrayBuffer());
  if (rawBody.length > 1_000_000 || !verifyResendWebhook(rawBody, request.headers, secret)) {
    return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
  }
  const event = JSON.parse(rawBody.toString("utf8")) as { type?: string; data?: { email_id?: string; message_id?: string } };
  const id = request.headers.get("svix-id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const db = createServiceClient();
  const { error: eventError } = await db.from("support_email_webhook_events").upsert({
    provider: "resend", event_id: id, event_type: event.type ?? "unknown", status: "pending",
    provider_message_id: event.data?.email_id ?? null,
  }, { onConflict: "provider,event_id", ignoreDuplicates: true });
  if (eventError) return NextResponse.json({ ok: false }, { status: 503 });
  const deliveryStatuses: Record<string, string> = {
    "email.sent": "accepted",
    "email.delivered": "delivered",
    "email.delivery_delayed": "delayed",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.failed": "failed",
    "email.suppressed": "suppressed",
  };
  const deliveryStatus = event.type ? deliveryStatuses[event.type] : undefined;
  if (!deliveryStatus || !event.data?.email_id) {
    await db.from("support_email_webhook_events").update({ status: "ignored", processed_at: new Date().toISOString() }).eq("provider", "resend").eq("event_id", id);
    return NextResponse.json({ ok: true });
  }

  const { data: outbound, error } = await db.from("outbound_emails")
    .select("related_entity_type, related_entity_id, metadata")
    .eq("provider", "resend").eq("provider_message_id", event.data.email_id).maybeSingle();
  if (error) return NextResponse.json({ ok: false }, { status: 503 });
  if (!outbound) {
    if (event.type === "email.sent") {
      await db.from("support_email_webhook_events").update({ status: "failed", error_code: "OUTBOUND_LOG_PENDING" }).eq("provider", "resend").eq("event_id", id);
      return NextResponse.json({ ok: false, error: "OUTBOUND_LOG_PENDING" }, { status: 503 });
    }
    await db.from("support_email_webhook_events").update({ status: "ignored", processed_at: new Date().toISOString() }).eq("provider", "resend").eq("event_id", id);
    return NextResponse.json({ ok: true });
  }

  const { error: deliveryUpdateError } = await db.from("outbound_emails")
    .update({ provider_delivery_status: deliveryStatus })
    .eq("provider", "resend")
    .eq("provider_message_id", event.data.email_id);
  if (deliveryUpdateError) return NextResponse.json({ ok: false }, { status: 503 });

  if (event.type !== "email.sent") {
    await db.from("support_email_webhook_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("provider", "resend").eq("event_id", id);
    return NextResponse.json({ ok: true });
  }
  if (!event.data.message_id) {
    await db.from("support_email_webhook_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("provider", "resend").eq("event_id", id);
    return NextResponse.json({ ok: true });
  }
  const metadata = outbound.metadata as Record<string, unknown> | null;
  if (metadata?.inbox_email_threading !== true) {
    await db.from("support_email_webhook_events").update({ status: "ignored", processed_at: new Date().toISOString() }).eq("provider", "resend").eq("event_id", id);
    return NextResponse.json({ ok: true });
  }
  if (outbound.related_entity_type !== "support_conversation" || !outbound.related_entity_id) {
    await db.from("support_email_webhook_events").update({ status: "ignored", processed_at: new Date().toISOString() }).eq("provider", "resend").eq("event_id", id);
    return NextResponse.json({ ok: true });
  }
  const supportMessageId = typeof metadata?.support_message_id === "string" ? metadata.support_message_id : null;
  const { error: linkError } = await db.from("support_email_message_links").upsert({
    provider: "resend", provider_message_id: event.data.email_id, rfc_message_id: event.data.message_id,
    direction: "outbound", conversation_id: outbound.related_entity_id, support_message_id: supportMessageId,
  }, { onConflict: "provider,provider_message_id" });
  if (linkError) {
    await db.from("support_email_webhook_events").update({ status: "failed", error_code: "MESSAGE_LINK_FAILED" }).eq("provider", "resend").eq("event_id", id);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const { error: threadLinkError } = await db.rpc("link_resend_support_email", {
    p_rfc_message_id: event.data.message_id,
    p_conversation_id: outbound.related_entity_id,
  });
  if (threadLinkError) {
    await db.from("support_email_webhook_events").update({ status: "failed", error_code: "THREAD_LINK_FAILED" }).eq("provider", "resend").eq("event_id", id);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  await db.from("support_email_webhook_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("provider", "resend").eq("event_id", id);
  return NextResponse.json({ ok: true });
}

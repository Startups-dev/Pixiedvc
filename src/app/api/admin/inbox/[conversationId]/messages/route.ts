import { NextResponse } from "next/server";

import { getAdminInboxContext } from "@/lib/admin-inbox-auth";
import { sendPlainEmail } from "@/lib/email";
import { sendTwilioMessage } from "@/lib/twilio-conversations";
import { randomUUID } from "node:crypto";

type RouteContext = { params: Promise<{ conversationId: string }> };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  const { conversationId } = await params;
  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const mode = body?.mode;
  if (!content || content.length > 10000 || !["reply", "internal_note"].includes(mode)) {
    return NextResponse.json({ ok: false, error: "INVALID_MESSAGE" }, { status: 400 });
  }

  const { data: conversation, error: conversationError } = await auth.client
    .from("support_conversations")
    .select("id, guest_email, guest_name, twilio_conversation_sid, inbox_status, handoff:support_handoffs(assigned_agent_user_id)")
    .eq("id", conversationId)
    .maybeSingle();
  if (conversationError || !conversation) {
    return NextResponse.json({ ok: false, error: "CONVERSATION_NOT_FOUND" }, { status: 404 });
  }

  const handoff = Array.isArray(conversation.handoff) ? conversation.handoff[0] : conversation.handoff;
  if (handoff?.assigned_agent_user_id && handoff.assigned_agent_user_id !== auth.user.id) {
    return NextResponse.json({ ok: false, error: "ASSIGNED_TO_ANOTHER_STAFF_MEMBER" }, { status: 409 });
  }

  const isInternal = mode === "internal_note";
  const idempotencyKey = typeof body?.idempotencyKey === "string" && /^[0-9a-f-]{36}$/i.test(body.idempotencyKey)
    ? body.idempotencyKey
    : randomUUID();
  let deliveryChannel: "twilio" | "email" | null = null;
  if (!isInternal) {
    if (conversation.twilio_conversation_sid) deliveryChannel = "twilio";
    else if (conversation.guest_email?.trim()) deliveryChannel = "email";
    else return NextResponse.json({ ok: false, error: "NO_CUSTOMER_REPLY_CHANNEL" }, { status: 409 });
  }

  const nicknameResult = await auth.client
    .from("support_agents")
    .select("nickname")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const displayName = nicknameResult.data?.nickname?.trim() || "HannaDVC Staff";
  const now = new Date().toISOString();
  const deliveryStatus = isInternal ? "not_applicable" : "pending";
  const { data: message, error: insertError } = await auth.client
    .from("support_messages")
    .insert({
      conversation_id: conversationId,
      sender: "agent",
      sender_type: "agent",
      sender_user_id: auth.user.id,
      agent_user_id: auth.user.id,
      sender_display_name: displayName,
      message: content,
      content,
      visibility: isInternal ? "internal" : "customer",
      delivery_status: deliveryStatus,
      metadata: { source: "admin_inbox", visibility: isInternal ? "internal" : "customer" },
      inbox_idempotency_key: isInternal ? null : idempotencyKey,
      created_at: now,
    })
    .select("id")
    .single();
  if (insertError && !isInternal) {
    const duplicate = await auth.client.from("support_messages")
      .select("id, delivery_status")
      .eq("inbox_idempotency_key", idempotencyKey)
      .maybeSingle();
    if (duplicate.data) {
      if (duplicate.data.delivery_status === "sent") return NextResponse.json({ ok: true, kind: "customer_reply", deliveryStatus: "sent", deduplicated: true, messageId: duplicate.data.id });
      if (duplicate.data.delivery_status === "sending" || duplicate.data.delivery_status === "pending") return NextResponse.json({ ok: false, error: "DELIVERY_ALREADY_IN_PROGRESS", messageId: duplicate.data.id }, { status: 202 });
      return NextResponse.json({ ok: false, error: "DELIVERY_ALREADY_FAILED", messageId: duplicate.data.id, deliveryStatus: duplicate.data.delivery_status }, { status: 409 });
    }
  }
  if (insertError || !message) {
    return NextResponse.json({ ok: false, error: "MESSAGE_PERSIST_FAILED" }, { status: 500 });
  }

  if (isInternal) {
    await auth.client.from("support_conversations").update({ updated_at: now }).eq("id", conversationId);
    return NextResponse.json({ ok: true, kind: "internal_note", deliveryStatus: "not_applicable" });
  }

  const { data: claimedMessage } = await auth.client.from("support_messages")
    .update({ delivery_status: "sending" })
    .eq("id", message.id)
    .eq("delivery_status", "pending")
    .select("id")
    .maybeSingle();
  if (!claimedMessage) {
    return NextResponse.json({ ok: false, error: "DELIVERY_ALREADY_IN_PROGRESS", messageId: message.id }, { status: 202 });
  }

  let sent = false;
  let failure = "delivery_failed";
  try {
    if (deliveryChannel === "twilio" && conversation.twilio_conversation_sid) {
      await sendTwilioMessage({
        conversationSid: conversation.twilio_conversation_sid,
        author: `agent:${auth.user.id}`,
        body: content,
        attributes: { source: "admin-inbox" },
      });
      sent = true;
    } else if (deliveryChannel === "email" && conversation.guest_email) {
      const { data: threadLinks } = await auth.client.from("support_email_message_links")
        .select("rfc_message_id")
        .eq("conversation_id", conversationId)
        .not("rfc_message_id", "is", null)
        .order("created_at", { ascending: true })
        .limit(50);
      const referenceIds = Array.from(new Set((threadLinks ?? []).map((link) => link.rfc_message_id).filter((value): value is string => Boolean(value))));
      const latestReference = referenceIds.at(-1);
      const result = await sendPlainEmail({
        to: conversation.guest_email,
        subject: "HannaDVC support reply",
        body: `Hi${conversation.guest_name ? ` ${conversation.guest_name}` : ""},\n\n${content}\n\nHannaDVC Support`,
        html: `<p>Hi${conversation.guest_name ? ` ${escapeHtml(conversation.guest_name)}` : ""},</p><p>${escapeHtml(content).replace(/\n/g, "<br>")}</p><p>HannaDVC Support</p>`,
        context: "admin inbox customer reply",
        templateKey: "admin_inbox_reply",
        replyTo: "hello@hannadvc.com",
        headers: latestReference ? {
          "In-Reply-To": latestReference,
          References: referenceIds.join(" "),
        } : undefined,
        idempotencyKey: `inbox-reply-${message.id}`,
        relatedEntityType: "support_conversation",
        relatedEntityId: conversationId,
        recipientUserId: null,
        metadata: { conversation_id: conversationId, support_message_id: message.id, inbox_channel: "email", inbox_email_threading: true },
      });
      sent = result.status === "sent";
      if (!sent) failure = "email_provider_rejected";
    }
  } catch {
    failure = deliveryChannel === "twilio" ? "twilio_delivery_failed" : "email_delivery_failed";
  }

  const finalStatus = sent ? "sent" : "failed";
  const messageMetadata = {
    source: "admin_inbox",
    visibility: "customer",
    delivery_channel: deliveryChannel,
    delivery_error: sent ? null : failure,
  };
  const { error: updateMessageError } = await auth.client
    .from("support_messages")
    .update({ delivery_status: finalStatus, metadata: messageMetadata })
    .eq("id", message.id);
  if (updateMessageError) {
    return NextResponse.json({ ok: false, error: "DELIVERY_STATUS_SAVE_FAILED", messagePersisted: true }, { status: 500 });
  }

  await auth.client.from("support_conversations").update({
    inbox_status: sent ? "waiting_customer" : "needs_reply",
    unread_for_staff: false,
    status: sent ? "claimed" : "handoff",
    updated_at: now,
  }).eq("id", conversationId);
  await auth.client.from("support_handoffs").update({ status: sent ? "claimed" : "open" }).eq("conversation_id", conversationId);

  if (!sent) {
    return NextResponse.json({ ok: false, error: failure, messageId: message.id, deliveryStatus: finalStatus }, { status: 502 });
  }
  return NextResponse.json({ ok: true, kind: "customer_reply", deliveryStatus: finalStatus, channel: deliveryChannel, messageId: message.id });
}

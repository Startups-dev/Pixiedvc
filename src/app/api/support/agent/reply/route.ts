import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";
import { getSupportAgentEligibility } from "@/lib/support-agent-auth";
import { sendPlainEmail } from "@/lib/email";
import { sendTwilioMessage } from "@/lib/twilio-conversations";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!conversationId || !content || content.length > 10000) {
    return NextResponse.json({ ok: false, error: "Conversation and content are required." }, { status: 400 });
  }

  const eligibility = await getSupportAgentEligibility();
  if (!eligibility) return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  if (!eligibility.isAdmin && !eligibility.isSupportAgent) return NextResponse.json({ ok: false, error: "NOT_AGENT_ELIGIBLE" }, { status: 403 });

  const supabase = createServiceClient();
  const { data: conversation } = await supabase
    .from("support_conversations")
    .select("guest_email, guest_name, twilio_conversation_sid, handoff:support_handoffs(assigned_agent_user_id)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return NextResponse.json({ ok: false, error: "CONVERSATION_NOT_FOUND" }, { status: 404 });
  const handoff = Array.isArray(conversation.handoff) ? conversation.handoff[0] : conversation.handoff;
  if (!eligibility.isAdmin && handoff?.assigned_agent_user_id !== eligibility.user.id) {
    return NextResponse.json({ ok: false, error: "NOT_ASSIGNED_TO_AGENT" }, { status: 403 });
  }
  const channel = conversation.twilio_conversation_sid ? "twilio" : conversation.guest_email ? "email" : null;
  if (!channel) return NextResponse.json({ ok: false, error: "NO_CUSTOMER_REPLY_CHANNEL" }, { status: 409 });

  const { data: agent } = await supabase.from("support_agents").select("nickname").eq("user_id", eligibility.user.id).maybeSingle();
  const agentNickname = agent?.nickname?.trim() || "HannaDVC Support";
  const createdAt = new Date().toISOString();
  const { data: message, error: insertError } = await supabase.from("support_messages").insert({
    conversation_id: conversationId,
    sender: "agent",
    sender_type: "agent",
    sender_user_id: eligibility.user.id,
    sender_display_name: agentNickname,
    agent_user_id: eligibility.user.id,
    message: content,
    content,
    visibility: "customer",
    delivery_status: "pending",
    metadata: { source: "support_agent_console", visibility: "customer" },
    created_at: createdAt,
  }).select("id").single();
  if (insertError || !message) return NextResponse.json({ ok: false, error: "MESSAGE_PERSIST_FAILED" }, { status: 500 });

  let delivered = false;
  let deliveryError = channel === "twilio" ? "twilio_delivery_failed" : "email_delivery_failed";
  try {
    if (channel === "twilio" && conversation.twilio_conversation_sid) {
      await sendTwilioMessage({ conversationSid: conversation.twilio_conversation_sid, author: `agent:${eligibility.user.id}`, body: content, attributes: { source: "pixiedvc-web-agent" } });
      delivered = true;
    } else if (conversation.guest_email) {
      const emailResult = await sendPlainEmail({
        to: conversation.guest_email,
        subject: "HannaDVC support reply",
        body: `Hi${conversation.guest_name ? ` ${conversation.guest_name}` : ""},\n\n${content}\n\nHannaDVC Support`,
        context: "support agent customer reply",
        templateKey: "support_agent_reply",
        relatedEntityType: "support_conversation",
        relatedEntityId: conversationId,
        metadata: { conversation_id: conversationId, inbox_channel: "email" },
      });
      delivered = emailResult.status === "sent";
      if (!delivered) deliveryError = "email_provider_rejected";
    }
  } catch {
    // Persist and expose the failed delivery state below.
  }

  const finalDeliveryStatus = delivered ? "sent" : "failed";
  await supabase.from("support_messages").update({
    delivery_status: finalDeliveryStatus,
    metadata: { source: "support_agent_console", visibility: "customer", delivery_channel: channel, delivery_error: delivered ? null : deliveryError },
  }).eq("id", message.id);
  await supabase.from("support_conversations").update({
    status: delivered ? "claimed" : "handoff",
    inbox_status: delivered ? "waiting_customer" : "needs_reply",
    unread_for_staff: false,
    agent_user_id: eligibility.user.id,
    agent_nickname: agentNickname,
    updated_at: new Date().toISOString(),
  }).eq("id", conversationId);
  await supabase.from("support_handoffs").update({ status: delivered ? "claimed" : "open" }).eq("conversation_id", conversationId);

  if (!delivered) return NextResponse.json({ ok: false, error: deliveryError, messageId: message.id, deliveryStatus: finalDeliveryStatus }, { status: 502 });
  return NextResponse.json({ ok: true, channel, deliveryStatus: finalDeliveryStatus, messageId: message.id });
}

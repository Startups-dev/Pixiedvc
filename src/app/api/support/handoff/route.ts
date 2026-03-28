import { NextResponse } from "next/server";

import { sendConciergeHandoffNotification } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase-service-client";

export async function POST(request: Request) {
  const body = await request.json();
  const transcript = body?.transcript ?? [];
  const pageUrl = body?.pageUrl ? String(body.pageUrl) : null;
  const name = body?.name ? String(body.name) : null;
  const topic = body?.topic ? String(body.topic) : null;
  const message = body?.message ? String(body.message) : null;

  if (!Array.isArray(transcript) || transcript.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Transcript is required." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("support_conversations")
    .insert({
      guest_email: body?.email ?? null,
      status: "handoff",
      page_url: pageUrl,
      guest_name: name,
      topic,
      intake_message: message,
    })
    .select("id")
    .single();

  if (conversationError || !conversation) {
    return NextResponse.json(
      { ok: false, error: "Unable to create conversation." },
      { status: 400 },
    );
  }

  const messages = (transcript as Array<{ role?: string; content?: string }>)
    .map((item) => ({
      conversation_id: conversation.id,
      sender: item.role === "assistant" ? "ai" : "guest",
      content: String(item.content ?? ""),
    }))
    .filter((item) => item.content.trim().length > 0);

  if (messages.length > 0) {
    await supabase.from("support_messages").insert(messages);
  }

  await supabase.from("support_handoffs").insert({
    conversation_id: conversation.id,
    status: "open",
  });

  const { data: assignment } = await supabase.rpc("assign_support_handoff", {
    p_conversation_id: conversation.id,
  });

  const assignedAgentUserId =
    assignment && assignment.length > 0
      ? assignment[0].assigned_agent_user_id
      : null;

  if (!assignedAgentUserId) {
    await sendConciergeHandoffNotification({
      conversationId: conversation.id,
      name,
      email: body?.email ?? null,
      message: message ?? lastGuestMessageFromTranscript(transcript),
      pageUrl,
      source: "handoff",
    }).catch((error) => {
      console.warn("[support/handoff] notification failed", error);
    });
    return NextResponse.json(
      {
        ok: true,
        assigned: false,
        conversationId: conversation.id,
        noAgentAvailable: true,
      },
    );
  }

  await sendConciergeHandoffNotification({
    conversationId: conversation.id,
    name,
    email: body?.email ?? null,
    message: message ?? lastGuestMessageFromTranscript(transcript),
    pageUrl,
    source: "handoff",
  }).catch((error) => {
    console.warn("[support/handoff] notification failed", error);
  });

  return NextResponse.json({
    ok: true,
    assigned: true,
    conversationId: conversation.id,
    agentUserId: assignedAgentUserId,
  });
}

function lastGuestMessageFromTranscript(transcript: unknown) {
  if (!Array.isArray(transcript)) return null;
  for (let i = transcript.length - 1; i >= 0; i -= 1) {
    const item = transcript[i] as { role?: string; content?: string } | null;
    if (item?.role === "user" && typeof item.content === "string" && item.content.trim()) {
      return item.content.trim();
    }
  }
  return null;
}

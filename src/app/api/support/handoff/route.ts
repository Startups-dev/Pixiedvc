import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";

export async function POST(request: Request) {
  const body = await request.json();
  const transcript = body?.transcript ?? [];

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
    return NextResponse.json(
      {
        ok: true,
        assigned: false,
        conversationId: conversation.id,
        noAgentAvailable: true,
      },
    );
  }

  return NextResponse.json({
    ok: true,
    assigned: true,
    conversationId: conversation.id,
    agentUserId: assignedAgentUserId,
  });
}

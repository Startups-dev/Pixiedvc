import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";

export async function POST(request: Request) {
  const body = await request.json();
  const conversationId = body?.conversationId as string | undefined;
  const guestEmail = body?.guestEmail ? String(body.guestEmail) : null;
  const lastUserMessage = body?.lastUserMessage
    ? String(body.lastUserMessage)
    : null;

  const supabase = createServiceClient();

  let conversation = conversationId;

  if (!conversation) {
    const { data, error } = await supabase
      .from("support_conversations")
      .insert({
        guest_email: guestEmail,
        status: "handoff",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[support/escalate] create conversation failed", error);
      return NextResponse.json(
        {
          ok: false,
          error: error?.message || "Unable to create conversation.",
        },
        { status: 400 },
      );
    }

    conversation = data.id;
  } else {
    await supabase
      .from("support_conversations")
      .update({ status: "handoff", guest_email: guestEmail })
      .eq("id", conversation);
  }

  if (lastUserMessage) {
    await supabase.from("support_messages").insert({
      conversation_id: conversation,
      sender: "guest",
      content: lastUserMessage,
    });
  }

  const { error: handoffError } = await supabase.from("support_handoffs").upsert(
    {
      conversation_id: conversation,
      status: "open",
    },
    { onConflict: "conversation_id" },
  );
  if (handoffError) {
    console.error("[support/escalate] handoff upsert failed", handoffError);
    return NextResponse.json(
      { ok: false, error: handoffError.message },
      { status: 400 },
    );
  }

  const { data: assignment, error: assignmentError } = await supabase.rpc(
    "assign_support_handoff",
    {
      p_conversation_id: conversation,
    },
  );

  if (assignmentError) {
    console.error("[support/escalate] assignment failed", assignmentError);
    return NextResponse.json(
      { ok: false, error: assignmentError.message },
      { status: 400 },
    );
  }

  const assignedAgentUserId =
    assignment && assignment.length > 0
      ? assignment[0].assigned_agent_user_id
      : null;

  if (assignedAgentUserId) {
    await supabase.from("support_messages").insert({
      conversation_id: conversation,
      sender: "ai",
      content:
        "You’re connected to a concierge. They’ll reply here shortly.",
    });
  } else {
    await supabase.from("support_messages").insert({
      conversation_id: conversation,
      sender: "ai",
      content:
        "All concierge seats are currently busy. If you’d like, share your email and we’ll follow up.",
    });
  }

  return NextResponse.json({
    ok: true,
    conversationId: conversation,
    assigned: Boolean(assignedAgentUserId),
    agentUserId: assignedAgentUserId,
    noAgentAvailable: !assignedAgentUserId,
  });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(request: Request) {
  const body = await request.json();
  const conversationId = String(body?.conversationId ?? "");
  const content = String(body?.content ?? "").trim();

  if (!conversationId || !content) {
    return NextResponse.json(
      { ok: false, error: "Conversation and content are required." },
      { status: 400 },
    );
  }

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { data: handoff, error: handoffError } = await supabase
    .from("support_handoffs")
    .select("assigned_agent_user_id")
    .eq("conversation_id", conversationId)
    .single();

  if (handoffError) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (handoff.assigned_agent_user_id !== user.id) {
    const { data: agent } = await supabase
      .from("support_agents")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (!agent || agent.role !== "admin") {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }

  const { error } = await supabase.from("support_messages").insert({
    conversation_id: conversationId,
    sender: "agent",
    agent_user_id: user.id,
    content,
  });

  if (error) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

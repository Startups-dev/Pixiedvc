import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase-service-client";
import { sendTwilioMessage } from "@/lib/twilio-conversations";
import { getSupportAgentEligibility } from "@/lib/support-agent-auth";

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

  const supabase = await createSupabaseServerClient();
  const eligibility = await getSupportAgentEligibility();
  if (!eligibility) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!eligibility.isAdmin && !eligibility.isSupportAgent) {
    return NextResponse.json({ ok: false, error: "NOT_AGENT_ELIGIBLE" }, { status: 403 });
  }

  const { data: handoff, error: handoffError } = await supabase
    .from("support_handoffs")
    .select("assigned_agent_user_id")
    .eq("conversation_id", conversationId)
    .single();

  if (handoffError) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let agentNickname = "Pixie Concierge";
  if (handoff.assigned_agent_user_id !== eligibility.user.id) {
    const { data: agent } = await supabase
      .from("support_agents")
      .select("role, nickname")
      .eq("user_id", eligibility.user.id)
      .single();
    if (!agent || agent.role !== "admin") {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    agentNickname = agent.nickname?.trim() || agentNickname;
  } else {
    const { data: agent } = await supabase
      .from("support_agents")
      .select("nickname")
      .eq("user_id", eligibility.user.id)
      .maybeSingle();
    agentNickname = agent?.nickname?.trim() || agentNickname;
  }

  const { error } = await supabase.from("support_messages").insert({
    conversation_id: conversationId,
    sender: "agent",
    sender_type: "agent",
    sender_user_id: eligibility.user.id,
    sender_display_name: agentNickname,
    message: content,
    agent_user_id: eligibility.user.id,
    content,
  });

  if (error) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data: conversation } = await serviceClient
    .from("support_conversations")
    .select("twilio_conversation_sid")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversation?.twilio_conversation_sid) {
    await sendTwilioMessage({
      conversationSid: conversation.twilio_conversation_sid,
      author: `agent:${eligibility.user.id}`,
      body: content,
      attributes: { source: "pixiedvc-web-agent" },
    });
  }

  await supabase
    .from("support_conversations")
    .update({
      status: "claimed",
      agent_user_id: eligibility.user.id,
      agent_nickname: agentNickname,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  return NextResponse.json({ ok: true });
}

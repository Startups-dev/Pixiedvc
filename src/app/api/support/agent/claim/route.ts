import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupportAgentEligibility } from "@/lib/support-agent-auth";

export async function POST(request: Request) {
  const body = await request.json();
  const conversationId = String(body?.conversationId ?? "");

  if (!conversationId) {
    return NextResponse.json(
      { ok: false, error: "Conversation is required." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const eligibility = await getSupportAgentEligibility();
  if (!eligibility) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!eligibility.isAdmin && !eligibility.isSupportAgent) {
    return NextResponse.json(
      { ok: false, error: "NOT_AGENT_ELIGIBLE" },
      { status: 403 },
    );
  }

  const { data: agent } = await supabase
    .from("support_agents")
    .select("online, active, max_concurrent")
    .eq("user_id", eligibility.user.id)
    .single();

  if (!agent || !agent.active || !agent.online) {
    return NextResponse.json(
      { ok: false, error: "Agent is offline." },
      { status: 400 },
    );
  }

  const { count: activeCount } = await supabase
    .from("support_handoffs")
    .select("id", { count: "exact" })
    .eq("assigned_agent_user_id", eligibility.user.id)
    .in("status", ["open", "claimed"]);

  if ((activeCount ?? 0) >= agent.max_concurrent) {
    return NextResponse.json(
      { ok: false, error: "Agent at capacity." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("support_handoffs")
    .update({
      assigned_agent_user_id: eligibility.user.id,
      status: "claimed",
      claimed_at: new Date().toISOString(),
    })
    .eq("conversation_id", conversationId)
    .is("assigned_agent_user_id", null);

  if (error) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await supabase
    .from("support_agents")
    .update({ last_assigned_at: new Date().toISOString() })
    .eq("user_id", eligibility.user.id);

  return NextResponse.json({ ok: true });
}

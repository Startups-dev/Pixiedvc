import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupportAgentEligibility } from "@/lib/support-agent-auth";

export async function GET() {
  await createSupabaseServerClient();
  const eligibility = await getSupportAgentEligibility();
  if (!eligibility) {
    return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("support_handoffs")
    .select(
      "conversation_id,status,created_at,conversation:support_conversations(status,handoff_mode,guest_name,guest_email,updated_at)",
    )
    .eq("assigned_agent_user_id", eligibility.user.id)
    .in("status", ["open", "claimed"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    seats: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const clearAll = Boolean(body?.clearAll);
  const conversationId = String(body?.conversationId ?? "").trim();

  await createSupabaseServerClient();
  const eligibility = await getSupportAgentEligibility();
  if (!eligibility) {
    return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("support_handoffs")
    .update({
      status: "closed",
      closed_at: nowIso,
      resolved_at: nowIso,
    })
    .eq("assigned_agent_user_id", eligibility.user.id)
    .in("status", ["open", "claimed"]);

  if (!clearAll) {
    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: "conversationId is required unless clearAll=true" },
        { status: 400 },
      );
    }
    query = query.eq("conversation_id", conversationId);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  if (clearAll) {
    await supabase
      .from("support_conversations")
      .update({ status: "closed", closed_at: nowIso, updated_at: nowIso })
      .eq("agent_user_id", eligibility.user.id)
      .in("status", ["open", "claimed"]);
  } else {
    await supabase
      .from("support_conversations")
      .update({ status: "closed", closed_at: nowIso, updated_at: nowIso })
      .eq("id", conversationId)
      .in("status", ["open", "claimed"]);
  }

  return NextResponse.json({ ok: true });
}

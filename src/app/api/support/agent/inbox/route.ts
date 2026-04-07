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
  const [assignedResult, queueResult, resolvedResult] = await Promise.all([
    supabase
      .from("support_handoffs")
      .select(
        "conversation_id,status,assigned_agent_user_id,created_at,conversation:support_conversations(status,handoff_mode,guest_name,guest_email,updated_at)",
      )
      .eq("assigned_agent_user_id", eligibility.user.id)
      .in("status", ["open", "claimed"])
      .order("created_at", { ascending: false }),
    supabase
      .from("support_handoffs")
      .select(
        "conversation_id,status,assigned_agent_user_id,created_at,conversation:support_conversations(status,handoff_mode,guest_name,guest_email,updated_at)",
      )
      .is("assigned_agent_user_id", null)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase
      .from("support_handoffs")
      .select(
        "conversation_id,status,assigned_agent_user_id,created_at,conversation:support_conversations(status,handoff_mode,guest_name,guest_email,updated_at,closed_at)",
      )
      .eq("assigned_agent_user_id", eligibility.user.id)
      .in("status", ["resolved", "closed"])
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  if (assignedResult.error || queueResult.error || resolvedResult.error) {
    console.error("[support/agent/inbox] handoff query failed", {
      assignedError: assignedResult.error?.message ?? null,
      queueError: queueResult.error?.message ?? null,
      resolvedError: resolvedResult.error?.message ?? null,
    });
    return NextResponse.json({
      ok: true,
      assigned: [],
      queue: [],
      resolved: [],
      degraded: true,
      error:
        assignedResult.error?.message ||
        resolvedResult.error?.message ||
        queueResult.error?.message ||
        "inbox_load_failed",
    });
  }

  const assigned = assignedResult.data ?? [];
  const queue = queueResult.data ?? [];
  const resolved = resolvedResult.data ?? [];

  const withDefaultPreview = <T extends { conversation_id: string }>(rows: T[]) =>
    rows.map((row) => {
      return {
        ...row,
        last_message_preview: "Open conversation",
        last_message_at: null,
        last_sender: null,
      };
    });

  return NextResponse.json({
    ok: true,
    assigned: withDefaultPreview([...assigned, ...resolved]),
    queue: withDefaultPreview(queue),
    resolved: withDefaultPreview(resolved),
  });
}

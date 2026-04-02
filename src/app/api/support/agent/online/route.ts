import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupportAgentEligibility } from "@/lib/support-agent-auth";
import { createServiceClient } from "@/lib/supabase-service-client";

async function buildAgentLiveStatus(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
) {
  const { data: agent } = await supabase
    .from("support_agents")
    .select("online, active, max_concurrent, role, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  const { count: activeCount } = await supabase
    .from("support_handoffs")
    .select("id", { count: "exact", head: true })
    .eq("assigned_agent_user_id", userId)
    .in("status", ["open", "claimed"]);

  const openChats = activeCount ?? 0;
  const maxConcurrent = agent?.max_concurrent ?? 1;
  const isOnline = Boolean(agent?.online);
  const isActive = Boolean(agent?.active);
  const canReceiveLiveChats = Boolean(isOnline && isActive && openChats < maxConcurrent);

  return {
    isOnline,
    isActive,
    maxConcurrent,
    openChats,
    canReceiveLiveChats,
    supportAgentRole: agent?.role ?? null,
    supportAgentCreatedAt: agent?.created_at ?? null,
  };
}

export async function GET() {
  await createSupabaseServerClient();
  const supabase = createServiceClient();
  const eligibility = await getSupportAgentEligibility();
  if (!eligibility) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const liveStatus = await buildAgentLiveStatus(supabase, eligibility.user.id);
  return NextResponse.json({
    ok: true,
    isAdmin: eligibility.isAdmin,
    isSupportAgent: eligibility.isSupportAgent,
    profileRole: eligibility.profileRole,
    appRole: eligibility.appRole,
    ...liveStatus,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const online = Boolean(body?.online);
  const maxConcurrent =
    typeof body?.maxConcurrent === "number" ? body.maxConcurrent : undefined;

  await createSupabaseServerClient();
  const supabase = createServiceClient();
  const eligibility = await getSupportAgentEligibility();
  if (!eligibility) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!eligibility.isAdmin && !eligibility.isSupportAgent) {
    return NextResponse.json(
      {
        ok: false,
        error: "NOT_AGENT_ELIGIBLE",
        isAdmin: eligibility.isAdmin,
        profileRole: eligibility.profileRole,
        appRole: eligibility.appRole,
      },
      { status: 403 },
    );
  }

  const { error } = await supabase.from("support_agents").upsert(
    {
      user_id: eligibility.user.id,
      role: eligibility.isAdmin ? "admin" : eligibility.supportAgentRole ?? "agent",
      online,
      active: true,
      max_concurrent: maxConcurrent ?? 1,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[support/agent/online] upsert failed", {
      userId: eligibility.user.id,
      role: eligibility.isAdmin ? "admin" : eligibility.supportAgentRole ?? "agent",
      online,
      maxConcurrent: maxConcurrent ?? 1,
      code: (error as { code?: string }).code,
      message: (error as { message?: string }).message,
    });
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const liveStatus = await buildAgentLiveStatus(supabase, eligibility.user.id);
  return NextResponse.json({
    ok: true,
    isAdmin: eligibility.isAdmin,
    isSupportAgent: eligibility.isSupportAgent,
    profileRole: eligibility.profileRole,
    appRole: eligibility.appRole,
    ...liveStatus,
  });
}

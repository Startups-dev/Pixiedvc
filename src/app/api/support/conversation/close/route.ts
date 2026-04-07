import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase-service-client";
import { getSupportAgentEligibility } from "@/lib/support-agent-auth";
import { verifySupportLiveGuestToken } from "@/lib/support/live-guest-token";

export async function POST(request: Request) {
  const body = await request.json();
  const conversationId = String(body?.conversationId ?? "").trim();
  const guestLiveToken = String(body?.guestLiveToken ?? "");

  if (!conversationId) {
    return NextResponse.json(
      { ok: false, error: "conversationId is required." },
      { status: 400 },
    );
  }

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const serviceClient = createServiceClient();
  const { data: handoff } = await serviceClient
    .from("support_handoffs")
    .select("assigned_agent_user_id")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  const { data: conversation } = await serviceClient
    .from("support_conversations")
    .select("guest_user_id, guest_type")
    .eq("id", conversationId)
    .maybeSingle();

  const eligibility = user ? await getSupportAgentEligibility() : null;
  const isSupportAgent = Boolean(eligibility?.isAdmin || eligibility?.isSupportAgent);
  const isAssignedAgent = Boolean(user?.id) && handoff?.assigned_agent_user_id === user?.id;
  const isConversationGuest = Boolean(user?.id) && conversation?.guest_user_id === user?.id;
  const isAnonymousGuestWithToken =
    !user &&
    conversation?.guest_type === "anonymous" &&
    verifySupportLiveGuestToken(guestLiveToken, conversationId);

  if (!isConversationGuest && !isAssignedAgent && !isSupportAgent && !isAnonymousGuestWithToken) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();

  const { error: handoffError } = await serviceClient
    .from("support_handoffs")
    .update({
      status: "closed",
      closed_at: nowIso,
      resolved_at: nowIso,
    })
    .eq("conversation_id", conversationId)
    .in("status", ["open", "claimed", "resolved"]);

  if (handoffError) {
    return NextResponse.json(
      { ok: false, error: handoffError.message },
      { status: 400 },
    );
  }

  await serviceClient
    .from("support_messages")
    .insert({
      conversation_id: conversationId,
      sender: "ai",
      sender_type: "system",
      sender_user_id: user?.id ?? null,
      sender_display_name: "System",
      message: isAssignedAgent
        ? "Concierge ended the conversation."
        : "Guest ended the conversation.",
      content: isAssignedAgent
        ? "Concierge ended the conversation."
        : "Guest ended the conversation.",
      metadata: { closedBy: isAssignedAgent ? "agent" : "guest" },
    });

  const { data: transcript } = await serviceClient
    .from("support_messages")
    .select("sender_type, sender, sender_display_name, message, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(12);

  const summary = (transcript ?? [])
    .slice()
    .reverse()
    .map((entry) => {
      const senderType = entry.sender_type ?? entry.sender ?? "system";
      const senderName =
        entry.sender_display_name ??
        (senderType === "guest"
          ? "Guest"
          : senderType === "agent"
            ? "Concierge"
            : senderType === "ai"
              ? "Pixie Concierge"
              : "System");
      const text = (entry.message ?? entry.content ?? "").trim();
      if (!text) return null;
      return `${senderName}: ${text}`;
    })
    .filter(Boolean)
    .join(" | ")
    .slice(0, 2000);

  await serviceClient
    .from("support_conversations")
    .update({
      status: "closed",
      closed_at: nowIso,
      updated_at: nowIso,
      summary: summary || null,
    })
    .eq("id", conversationId);

  return NextResponse.json({ ok: true });
}

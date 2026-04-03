import { NextResponse } from "next/server";

import { sendConciergeHandoffNotification } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase-service-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addTwilioParticipant,
  createTwilioConversation,
  isTwilioConfigured,
} from "@/lib/twilio-conversations";

export async function POST(request: Request) {
  const body = await request.json();
  const conversationId = body?.conversationId as string | undefined;
  const guestEmail = body?.guestEmail ? String(body.guestEmail) : null;
  const pageUrl = body?.pageUrl ? String(body.pageUrl) : null;
  const guestName = body?.guestName ? String(body.guestName).trim() : null;
  const lastUserMessage = body?.lastUserMessage
    ? String(body.lastUserMessage)
    : null;

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const supabase = createServiceClient();
  const twilioConfigured = isTwilioConfigured();

  let conversation = conversationId;
  let createdConversation = false;
  const guestType = user?.id ? "authenticated" : "anonymous";
  const resolvedGuestName =
    guestName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Anonymous Visitor";
  const resolvedGuestEmail = guestEmail ?? user?.email ?? null;
  const nowIso = new Date().toISOString();

  if (!conversation) {
    const { data, error } = await supabase
      .from("support_conversations")
      .insert({
        guest_email: resolvedGuestEmail,
        status: "open",
        page_url: pageUrl,
        source_page: pageUrl,
        guest_name: resolvedGuestName,
        guest_type: guestType,
        guest_user_id: user?.id ?? null,
        updated_at: nowIso,
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
    createdConversation = true;
  } else {
    await supabase
      .from("support_conversations")
      .update({
        status: "open",
        guest_email: resolvedGuestEmail,
        page_url: pageUrl,
        source_page: pageUrl,
        guest_name: resolvedGuestName,
        guest_type: guestType,
        guest_user_id: user?.id ?? null,
        updated_at: nowIso,
      })
      .eq("id", conversation);
  }

  if (lastUserMessage) {
    await supabase.from("support_messages").insert({
      conversation_id: conversation,
      sender: "guest",
      sender_type: "guest",
      sender_user_id: user?.id ?? null,
      sender_display_name: resolvedGuestName,
      message: lastUserMessage,
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

  if (!assignedAgentUserId) {
    const { data: onlineAgents } = await supabase
      .from("support_agents")
      .select("user_id, role, active, online, max_concurrent, created_at")
      .eq("active", true)
      .eq("online", true);
    const onlineAgentIds = (onlineAgents ?? []).map((agent) => agent.user_id);
    let activeHandoffs: { assigned_agent_user_id: string | null }[] = [];
    if (onlineAgentIds.length > 0) {
      const { data } = await supabase
        .from("support_handoffs")
        .select("assigned_agent_user_id")
        .in("assigned_agent_user_id", onlineAgentIds)
        .in("status", ["open", "claimed"]);
      activeHandoffs = data ?? [];
    }
    const openCountByAgent = new Map<string, number>();
    activeHandoffs.forEach((handoff) => {
      if (!handoff.assigned_agent_user_id) return;
      openCountByAgent.set(
        handoff.assigned_agent_user_id,
        (openCountByAgent.get(handoff.assigned_agent_user_id) ?? 0) + 1,
      );
    });
    const availableAgents = (onlineAgents ?? []).filter(
      (agent) => (openCountByAgent.get(agent.user_id) ?? 0) < (agent.max_concurrent ?? 1),
    );
    const reason =
      (onlineAgents?.length ?? 0) === 0
        ? "no_online_agents"
        : availableAgents.length === 0
          ? "online_agents_at_capacity"
          : "assignment_race_or_rpc_no_result";
    console.info("[support/escalate] no agent assigned", {
      reason,
      conversationId: conversation,
      onlineAgents: onlineAgents?.length ?? 0,
      availableAgents: availableAgents.length,
      twilioConfigured,
      guestUserPresent: Boolean(user?.id),
    });
  }

  let liveEnabled = false;
  let twilioConversationSid: string | null = null;
  let assignedAgentNickname: string | null = null;

  if (assignedAgentUserId && user?.id && twilioConfigured) {
    const { data: currentConversation } = await supabase
      .from("support_conversations")
      .select("twilio_conversation_sid, guest_name, guest_email")
      .eq("id", conversation)
      .maybeSingle();

    twilioConversationSid = currentConversation?.twilio_conversation_sid ?? null;
    try {
      if (!twilioConversationSid) {
        twilioConversationSid = await createTwilioConversation({
          uniqueName: `pixiedvc-support-${conversation}`,
          friendlyName: `Pixie Support ${conversation.slice(0, 8)}`,
          attributes: {
            conversationId: conversation,
            guestEmail: guestEmail ?? currentConversation?.guest_email ?? null,
            pageUrl: pageUrl ?? null,
            issueSummary: lastUserMessage ?? null,
          },
        });
      }

      await addTwilioParticipant(twilioConversationSid, `guest:${user.id}`);
      await addTwilioParticipant(twilioConversationSid, `agent:${assignedAgentUserId}`);

      await supabase
        .from("support_conversations")
        .update({
          twilio_conversation_sid: twilioConversationSid,
          handoff_mode: "twilio_live",
          status: "claimed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation);

      liveEnabled = true;
    } catch (error) {
      console.warn("[support/escalate] live handoff fallback to offline", {
        conversationId: conversation,
        assignedAgentUserId,
        reason: error instanceof Error ? error.message : "unknown",
      });
      liveEnabled = false;
    }
  } else if (assignedAgentUserId && !user?.id) {
    console.info("[support/escalate] live handoff unavailable", {
      reason: "guest_not_authenticated",
      conversationId: conversation,
      twilioConfigured,
    });
  } else if (assignedAgentUserId && !twilioConfigured) {
    console.info("[support/escalate] live handoff unavailable", {
      reason: "twilio_not_configured",
      conversationId: conversation,
    });
  }

  if (createdConversation) {
    await sendConciergeHandoffNotification({
      conversationId: conversation,
      email: resolvedGuestEmail,
      message: lastUserMessage,
      pageUrl,
      source: "escalate",
    }).catch((error) => {
      console.warn("[support/escalate] notification failed", error);
    });
  }

  if (assignedAgentUserId) {
    const { data: assignedAgent } = await supabase
      .from("support_agents")
      .select("nickname")
      .eq("user_id", assignedAgentUserId)
      .maybeSingle();
    assignedAgentNickname = assignedAgent?.nickname?.trim() || "Pixie Concierge";

    await supabase
      .from("support_conversations")
      .update({
        agent_user_id: assignedAgentUserId,
        agent_nickname: assignedAgentNickname,
        status: "claimed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation);
  }

  if (assignedAgentUserId) {
    await supabase.from("support_messages").insert({
      conversation_id: conversation,
      sender: "ai",
      sender_type: "system",
      sender_display_name: "System",
      message: `You’re connected to ${assignedAgentNickname ?? "a concierge"}. They’ll reply here shortly.`,
      content: `You’re connected to ${assignedAgentNickname ?? "a concierge"}. They’ll reply here shortly.`,
    });
  } else {
    await supabase.from("support_messages").insert({
      conversation_id: conversation,
      sender: "ai",
      sender_type: "system",
      sender_display_name: "System",
      message:
        "All concierge seats are currently busy. If you’d like, share your email and we’ll follow up.",
      content:
        "All concierge seats are currently busy. If you’d like, share your email and we’ll follow up.",
    });
    await supabase
      .from("support_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation);
  }

  return NextResponse.json({
    ok: true,
    conversationId: conversation,
    assigned: Boolean(assignedAgentUserId),
    agentUserId: assignedAgentUserId,
    noAgentAvailable: !assignedAgentUserId,
    liveEnabled,
    twilioConversationSid,
  });
}

import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupportAgentEligibility } from "@/lib/support-agent-auth";
import { verifySupportLiveGuestToken } from "@/lib/support/live-guest-token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");
  const includeClosed = searchParams.get("includeClosed") === "1";
  const guestLiveToken = searchParams.get("guestLiveToken") ?? "";

  if (!conversationId) {
    return NextResponse.json(
      { ok: false, error: "conversationId is required." },
      { status: 400 },
    );
  }

  const sessionClient = await createSupabaseServerClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  const eligibility = user ? await getSupportAgentEligibility() : null;
  const isStaff = Boolean(eligibility?.isAdmin || eligibility?.isSupportAgent);
  const supabase = createServiceClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("support_conversations")
    .select("id, status, handoff_mode, guest_user_id, guest_type")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError || !conversation) {
    return NextResponse.json(
      { ok: false, error: "Conversation not found." },
      { status: 400 },
    );
  }

  const isAuthenticatedGuest = Boolean(user?.id) && conversation.guest_user_id === user?.id;
  const isAnonymousGuest = !user && conversation.guest_type === "anonymous" &&
    verifySupportLiveGuestToken(guestLiveToken, conversationId);
  if (!isStaff && !isAuthenticatedGuest && !isAnonymousGuest) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: user ? 403 : 401 });
  }

  if (includeClosed && !isStaff) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  if (conversation.status === "closed" && !includeClosed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Conversation is closed.",
        closed: true,
        status: conversation.status,
        handoffMode: conversation.handoff_mode ?? null,
      },
      { status: 400 },
    );
  }

  const { data: rows, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[support/conversation] message query failed", {
      conversationId,
      message: error.message,
    });
    return NextResponse.json(
      { ok: false, error: "Unable to load conversation messages." },
      { status: 400 },
    );
  }

  const visibleRows = isStaff ? rows ?? [] : (rows ?? []).filter((row) => {
    if (row.visibility === "internal") return false;
    const message = typeof row.message === "string" ? row.message : "";
    return !/^\s*\[internal note\]/i.test(message);
  });
  const normalizedMessages = (visibleRows as Array<Record<string, unknown>>).map((row, index) => {
    const senderType = typeof row.sender_type === "string" ? row.sender_type : null;
    const sender = senderType ?? (typeof row.sender === "string" ? row.sender : "system");
    const messageValue = typeof row.message === "string" ? row.message : null;
    const contentValue = typeof row.content === "string" ? row.content : null;
    const senderDisplayName =
      typeof row.sender_display_name === "string" ? row.sender_display_name : null;
    const senderUserId =
      (typeof row.sender_user_id === "string" ? row.sender_user_id : null) ??
      (typeof row.agent_user_id === "string" ? row.agent_user_id : null);
    const createdAt =
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString();

    return {
      id: String(row.id ?? `${conversationId}-${index}`),
      sender,
      content: messageValue ?? contentValue ?? "",
      created_at: createdAt,
      sender_display_name: senderDisplayName,
      sender_user_id: senderUserId,
      visibility: row.visibility === "internal" ? "internal" : "customer",
      delivery_status: typeof row.delivery_status === "string" ? row.delivery_status : null,
    };
  });

  return NextResponse.json({
    ok: true,
    conversationId: conversation.id,
    status: conversation.status,
    handoffMode: conversation.handoff_mode ?? null,
    messages: normalizedMessages,
  });
}

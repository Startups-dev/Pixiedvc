import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendTwilioMessage } from "@/lib/twilio-conversations";
import { verifySupportLiveGuestToken } from "@/lib/support/live-guest-token";
import { persistSupportMessage } from "@/lib/support/persist-message";

export async function POST(request: Request) {
  const body = await request.json();
  const conversationId = String(body?.conversationId ?? "");
  const content = String(body?.content ?? "").trim();
  const guestLiveToken = String(body?.guestLiveToken ?? "");

  if (!conversationId || !content) {
    return NextResponse.json(
      { ok: false, error: "Conversation and content are required." },
      { status: 400 },
    );
  }

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const supabase = createServiceClient();
  const { data: conversation, error } = await supabase
    .from("support_conversations")
    .select("guest_user_id, guest_type, guest_name, guest_email, twilio_conversation_sid")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conversation?.twilio_conversation_sid) {
    return NextResponse.json({ ok: false, error: "Live conversation unavailable." }, { status: 404 });
  }

  const isAuthenticatedGuest = Boolean(user?.id) && conversation.guest_user_id === user?.id;
  const isAnonymousGuest =
    !user?.id &&
    conversation.guest_type === "anonymous" &&
    verifySupportLiveGuestToken(guestLiveToken, conversationId);
  if (!isAuthenticatedGuest && !isAnonymousGuest) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const senderDisplayName =
    conversation.guest_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    conversation.guest_email ||
    "Guest";
  const guestAuthor = user?.id ? `guest:${user.id}` : `guest:anon:${conversationId}`;

  const persistResult = await persistSupportMessage(supabase, {
    conversation_id: conversationId,
    sender: "guest",
    sender_type: "guest",
    sender_user_id: user?.id ?? null,
    sender_display_name: senderDisplayName,
    message: content,
    content,
    metadata: { source: "live_message" },
  });
  if (!persistResult.ok) {
    console.error("[support/live/message] message insert failed", {
      conversationId,
      fullError: persistResult.fullError?.message,
      fallbackError: persistResult.fallbackError?.message,
    });
    return NextResponse.json({ ok: false, error: "MESSAGE_PERSIST_FAILED" }, { status: 400 });
  }

  await sendTwilioMessage({
    conversationSid: conversation.twilio_conversation_sid,
    author: guestAuthor,
    body: content,
    attributes: { source: "pixiedvc-web-guest" },
  });

  await supabase
    .from("support_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return NextResponse.json({ ok: true });
}

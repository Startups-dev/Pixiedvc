import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendTwilioMessage } from "@/lib/twilio-conversations";

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

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: conversation, error } = await supabase
    .from("support_conversations")
    .select("guest_user_id, guest_name, twilio_conversation_sid")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conversation?.twilio_conversation_sid) {
    return NextResponse.json({ ok: false, error: "Live conversation unavailable." }, { status: 404 });
  }

  if (conversation.guest_user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  await supabase.from("support_messages").insert({
    conversation_id: conversationId,
    sender: "guest",
    sender_type: "guest",
    sender_user_id: user.id,
    sender_display_name: conversation.guest_name || user.email || "Guest",
    message: content,
    content,
    metadata: { source: "live_message" },
  });

  await sendTwilioMessage({
    conversationSid: conversation.twilio_conversation_sid,
    author: `guest:${user.id}`,
    body: content,
    attributes: { source: "pixiedvc-web-guest" },
  });

  await supabase
    .from("support_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return NextResponse.json({ ok: true });
}

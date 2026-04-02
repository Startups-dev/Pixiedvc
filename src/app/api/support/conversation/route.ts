import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";
import { listTwilioMessages } from "@/lib/twilio-conversations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json(
      { ok: false, error: "conversationId is required." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: conversation } = await supabase
    .from("support_conversations")
    .select("twilio_conversation_sid")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversation?.twilio_conversation_sid) {
    try {
      const twilioMessages = await listTwilioMessages(conversation.twilio_conversation_sid);
      const { data: aiMessages } = await supabase
        .from("support_messages")
        .select("id, sender, content, created_at")
        .eq("conversation_id", conversationId)
        .eq("sender", "ai")
        .order("created_at", { ascending: true });

      const merged = [...(aiMessages ?? []), ...twilioMessages].sort((a, b) => {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return aDate - bDate;
      });
      return NextResponse.json({ ok: true, messages: merged });
    } catch (error) {
      console.warn("[support/conversation] twilio fetch failed, using local messages");
    }
  }

  const { data, error } = await supabase
    .from("support_messages")
    .select("id, sender, agent_user_id, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: true, messages: data ?? [] });
}

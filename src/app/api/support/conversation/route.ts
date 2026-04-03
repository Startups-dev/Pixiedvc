import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";

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

  const { data, error } = await supabase
    .from("support_messages")
    .select(
      "id, sender, sender_type, agent_user_id, sender_user_id, sender_display_name, content, message, created_at",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const normalizedMessages = (data ?? []).map((row) => {
    const sender = row.sender_type ?? row.sender ?? "system";
    const content = row.message ?? row.content ?? "";
    return {
      id: row.id,
      sender,
      content,
      created_at: row.created_at,
      sender_display_name: row.sender_display_name,
      sender_user_id: row.sender_user_id ?? row.agent_user_id ?? null,
    };
  });

  return NextResponse.json({ ok: true, messages: normalizedMessages });
}

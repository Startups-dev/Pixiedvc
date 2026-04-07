type MinimalSupabaseClient = {
  from: (table: string) => {
    insert: (payload: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
  };
};

type SupportMessageInsert = {
  conversation_id: string;
  sender: "guest" | "ai" | "agent" | "system";
  content: string;
  sender_type?: string;
  sender_user_id?: string | null;
  sender_display_name?: string | null;
  message?: string;
  agent_user_id?: string | null;
  metadata?: Record<string, unknown>;
};

export async function persistSupportMessage(
  supabase: MinimalSupabaseClient,
  payload: SupportMessageInsert,
) {
  const { error: fullError } = await supabase.from("support_messages").insert(payload);
  if (!fullError) return { ok: true as const, mode: "full" as const };

  const fallbackPayload: Record<string, unknown> = {
    conversation_id: payload.conversation_id,
    sender: payload.sender,
    content: payload.content || payload.message || "",
  };

  if (payload.agent_user_id) {
    fallbackPayload.agent_user_id = payload.agent_user_id;
  }

  const { error: fallbackError } = await supabase
    .from("support_messages")
    .insert(fallbackPayload);
  if (!fallbackError) return { ok: true as const, mode: "fallback" as const };

  return {
    ok: false as const,
    fullError,
    fallbackError,
  };
}

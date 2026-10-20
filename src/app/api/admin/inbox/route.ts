import { NextResponse } from "next/server";

import { getAdminInboxContext } from "@/lib/admin-inbox-auth";

const INBOX_STATUSES = ["needs_reply", "waiting_customer", "closed"] as const;

export async function GET(request: Request) {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;

  const view = new URL(request.url).searchParams.get("view") ?? "needs_reply";
  if (![...INBOX_STATUSES, "assigned_to_me"].includes(view as (typeof INBOX_STATUSES)[number] | "assigned_to_me")) {
    return NextResponse.json({ ok: false, error: "INVALID_VIEW" }, { status: 400 });
  }

  const fields = "id, guest_name, guest_email, guest_type, guest_user_id, affiliate_id, affiliate_application_id, twilio_conversation_sid, topic, intake_message, page_url, source_page, context, inbox_source, inbox_status, unread_for_staff, contact_ack_status, contact_staff_alert_status, created_at, updated_at";
  const [handoffResult, contactResult] = await Promise.all([
    auth.client.from("support_conversations")
      .select(`${fields}, handoff:support_handoffs!inner(status, assigned_agent_user_id)`)
      .order("updated_at", { ascending: false })
      .limit(500),
    auth.client.from("support_conversations")
      .select(`${fields}, handoff:support_handoffs(status, assigned_agent_user_id)`)
      .in("inbox_source", ["contact_form", "email"])
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);

  if (handoffResult.error || contactResult.error) {
    return NextResponse.json({ ok: false, error: "INBOX_LOAD_FAILED" }, { status: 500 });
  }

  const uniqueRows = new Map<string, (typeof handoffResult.data)[number]>();
  for (const row of [...(handoffResult.data ?? []), ...(contactResult.data ?? [])]) {
    uniqueRows.set(row.id, row);
  }
  const rows = [...uniqueRows.values()].sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at)).slice(0, 500).map((row) => {
    const handoff = Array.isArray(row.handoff) ? row.handoff[0] : row.handoff;
    return {
      ...row,
      handoff: handoff ?? null,
      preview: row.topic?.trim() || row.intake_message?.trim() || "Conversation",
    };
  });
  const userIds = Array.from(new Set(rows.map((row) => row.guest_user_id).filter((value): value is string => Boolean(value))));
  const profileResult = userIds.length
    ? await auth.client.from("profiles").select("id, role").in("id", userIds)
    : { data: [], error: null };
  if (profileResult.error) {
    return NextResponse.json({ ok: false, error: "CUSTOMER_CONTEXT_LOAD_FAILED" }, { status: 500 });
  }
  const roles = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile.role]));
  const audienceLabel = (row: (typeof rows)[number]) => {
    if (row.affiliate_id || row.affiliate_application_id) return "Affiliate";
    const role = row.guest_user_id ? roles.get(row.guest_user_id) : null;
    if (role === "owner") return "Owner";
    if (role === "affiliate") return "Affiliate / partner";
    if (role === "guest") return "Guest";
    if (row.inbox_source === "contact_form") {
      const audience = (row.context as { audience?: string } | null)?.audience;
      if (audience === "owner") return "Owner (self-reported)";
      if (audience === "affiliate") return "Affiliate / partner (self-reported)";
      if (audience === "guest") return "Guest (self-reported)";
    }
    return row.guest_type === "authenticated" ? "Account holder" : "Visitor";
  };
  const counts = {
    needs_reply: rows.filter((row) => row.inbox_status === "needs_reply").length,
    assigned_to_me: rows.filter((row) => row.handoff?.assigned_agent_user_id === auth.user.id && row.inbox_status !== "closed").length,
    waiting_customer: rows.filter((row) => row.inbox_status === "waiting_customer").length,
    closed: rows.filter((row) => row.inbox_status === "closed").length,
  };
  const conversations = view === "assigned_to_me"
    ? rows.filter((row) => row.handoff?.assigned_agent_user_id === auth.user.id && row.inbox_status !== "closed")
    : rows.filter((row) => row.inbox_status === view);

  const previews = conversations.length
    ? await auth.client
        .from("support_messages")
        .select("conversation_id, sender_type, sender, visibility, message, content, created_at")
        .in("conversation_id", conversations.map((row) => row.id))
        .order("created_at", { ascending: false })
        .limit(1000)
    : { data: [], error: null };

  if (previews.error) {
    return NextResponse.json({ ok: false, error: "INBOX_PREVIEW_FAILED" }, { status: 500 });
  }
  const latest = new Map<string, { sender: string; preview: string; at: string }>();
  for (const message of previews.data ?? []) {
    if (latest.has(message.conversation_id)) continue;
    const sender = message.sender_type ?? message.sender ?? "system";
    latest.set(message.conversation_id, {
      sender,
      preview: message.visibility === "internal" ? "Internal note" : (message.message ?? message.content ?? "").slice(0, 180),
      at: message.created_at,
    });
  }

  return NextResponse.json({
    ok: true,
    currentUserId: auth.user.id,
    counts,
    conversations: conversations.map((row) => ({
      ...row,
      audience_label: audienceLabel(row),
      lastMessage: latest.get(row.id) ?? null,
    })),
  });
}

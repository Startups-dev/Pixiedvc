import { NextResponse } from "next/server";
import { isAlertableCustomerMessage } from "@/lib/admin-inbox-alerts";
import { getAdminInboxContext } from "@/lib/admin-inbox-auth";

const OVERLAP_MS = 5_000;
const MAX_EVENTS_PER_SOURCE = 1_000;

export async function GET(request: Request) {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const baseline = url.searchParams.get("baseline") === "1";
  const after = url.searchParams.get("after");
  if (!baseline && after && !Number.isFinite(Date.parse(after))) {
    return NextResponse.json({ ok: false, error: "INVALID_CURSOR" }, { status: 400 });
  }

  const db = auth.client;
  const unreadPromise = db.from("support_conversations")
    .select("id", { count: "exact", head: true })
    .eq("unread_for_staff", true);

  const since = after ? new Date(Date.parse(after) - OVERLAP_MS).toISOString() : null;
  const [unread, supportMessages, zohoLinks] = await Promise.all([
    unreadPromise,
    baseline || !since
      ? Promise.resolve({ data: [], error: null })
      : db.from("support_messages")
        .select("id, conversation_id, created_at, sender, sender_type, visibility, metadata")
        .gte("created_at", since)
        .or("sender_type.eq.guest,sender.eq.guest")
        .or("visibility.eq.customer,visibility.is.null")
        .order("created_at", { ascending: true })
        .limit(MAX_EVENTS_PER_SOURCE),
    baseline || !since
      ? Promise.resolve({ data: [], error: null })
      : db.from("support_email_message_links")
        .select("support_message_id, conversation_id, created_at, provider, direction")
        .eq("provider", "zoho")
        .eq("direction", "inbound")
        .not("support_message_id", "is", null)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(MAX_EVENTS_PER_SOURCE),
  ]);

  if (unread.error || supportMessages.error || zohoLinks.error) {
    return NextResponse.json({ ok: false, error: "INBOX_ALERTS_UNAVAILABLE" }, { status: 503 });
  }

  const inboundZohoLinks = (zohoLinks.data ?? []).filter((link) =>
    link.provider === "zoho" && link.direction === "inbound" && link.support_message_id,
  );
  const zohoMessageIds = [...new Set(inboundZohoLinks.map((link) => String(link.support_message_id)))];
  const zohoMessages = zohoMessageIds.length
    ? await db.from("support_messages")
      .select("id, conversation_id, sender, sender_type, visibility, metadata")
      .in("id", zohoMessageIds)
    : { data: [], error: null };
  if (zohoMessages.error) {
    return NextResponse.json({ ok: false, error: "INBOX_ALERTS_UNAVAILABLE" }, { status: 503 });
  }

  const events = new Map<string, { id: string; conversationId: string; createdAt: string }>();
  for (const message of supportMessages.data ?? []) {
    if (!isAlertableCustomerMessage(message)) continue;
    events.set(String(message.id), {
      id: String(message.id),
      conversationId: String(message.conversation_id),
      createdAt: String(message.created_at),
    });
  }
  const alertableZohoMessageIds = new Set((zohoMessages.data ?? [])
    .filter((message) => isAlertableCustomerMessage(message))
    .map((message) => String(message.id)));
  for (const link of inboundZohoLinks) {
    if (!link.conversation_id || !link.created_at || !alertableZohoMessageIds.has(String(link.support_message_id))) continue;
    const id = String(link.support_message_id);
    if (!events.has(id)) {
      events.set(id, { id, conversationId: String(link.conversation_id), createdAt: String(link.created_at) });
    }
  }

  if (events.size > 0) {
    console.info("Admin Inbox customer messages available for alert", { eventCount: events.size });
  }

  const now = new Date().toISOString();
  return NextResponse.json({
    ok: true,
    cursor: now,
    unreadCount: unread.count ?? 0,
    events: baseline ? [] : [...events.values()]
      .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
      .slice(0, MAX_EVENTS_PER_SOURCE),
  }, { headers: { "Cache-Control": "no-store, private" } });
}

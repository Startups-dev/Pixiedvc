import { NextResponse } from "next/server";

import { getAdminInboxContext } from "@/lib/admin-inbox-auth";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  const { conversationId } = await params;

  const { data: conversation, error } = await auth.client
    .from("support_conversations")
    .select("id, guest_name, guest_email, guest_type, guest_user_id, affiliate_id, affiliate_application_id, topic, intake_message, page_url, source_page, context, inbox_source, inbox_status, unread_for_staff, contact_ack_status, contact_staff_alert_status, created_at, updated_at, handoff_mode, twilio_conversation_sid, handoff:support_handoffs(status, assigned_agent_user_id)")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conversation) {
    return NextResponse.json({ ok: false, error: "CONVERSATION_NOT_FOUND" }, { status: 404 });
  }

  const { data: storedMessages, error: messagesError } = await auth.client
    .from("support_messages")
    .select("id, sender_type, sender, sender_display_name, sender_user_id, message, content, visibility, delivery_status, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(1000);

  if (messagesError) {
    return NextResponse.json({ ok: false, error: "TRANSCRIPT_LOAD_FAILED" }, { status: 500 });
  }
  const messages = storedMessages?.length || conversation.inbox_source !== "contact_form" || !conversation.intake_message
    ? storedMessages ?? []
    : [{
        id: `contact-intake-${conversationId}`,
        sender_type: "guest",
        sender: "guest",
        sender_display_name: conversation.guest_name,
        sender_user_id: null,
        message: conversation.intake_message,
        content: conversation.intake_message,
        visibility: "customer",
        delivery_status: null,
        metadata: { source: "contact_form_intake_record" },
        created_at: conversation.created_at,
      }];

  const userId = conversation.guest_user_id;
  const links: Array<{ label: string; href: string }> = [];
  let audienceLabel = conversation.guest_type === "authenticated" ? "Account holder" : "Visitor";
  if (conversation.affiliate_id || conversation.affiliate_application_id) audienceLabel = "Affiliate";
  if (userId) {
    const [profileResult, ownerResult, affiliateResult, bookingResult] = await Promise.all([
      auth.client.from("profiles").select("role").eq("id", userId).maybeSingle(),
      auth.client.from("owners").select("id").eq("user_id", userId).maybeSingle(),
      auth.client.from("affiliates").select("id").eq("auth_user_id", userId).maybeSingle(),
      auth.client.from("booking_requests").select("id").eq("renter_id", userId).order("created_at", { ascending: false }).limit(10),
    ]);
    if (profileResult.data?.role === "owner" || ownerResult.data?.id) audienceLabel = "Owner";
    else if (profileResult.data?.role === "affiliate" || affiliateResult.data?.id) audienceLabel = "Affiliate / partner";
    else if (profileResult.data?.role === "guest") audienceLabel = "Guest";
    else if (conversation.inbox_source === "contact_form") {
      const audience = (conversation.context as { audience?: string } | null)?.audience;
      if (audience === "owner") audienceLabel = "Owner (self-reported)";
      else if (audience === "affiliate") audienceLabel = "Affiliate / partner (self-reported)";
      else if (audience === "guest") audienceLabel = "Guest (self-reported)";
    }
    if (ownerResult.data?.id) links.push({ label: "Owner record", href: `/admin/owners/${encodeURIComponent(ownerResult.data.id)}` });
    if (affiliateResult.data?.id) links.push({ label: "Affiliate record", href: `/admin/affiliates/${encodeURIComponent(affiliateResult.data.id)}/analytics` });
    for (const booking of bookingResult.data ?? []) {
      links.push({ label: "Booking request", href: `/admin/requests/${encodeURIComponent(booking.id)}` });
    }
  }
  if (conversation.affiliate_id && !links.some((link) => link.label === "Affiliate record")) {
    links.push({ label: "Affiliate record", href: `/admin/affiliates/${encodeURIComponent(conversation.affiliate_id)}/analytics` });
  }
  if (conversation.affiliate_application_id) {
    links.push({ label: "Affiliate application", href: `/admin/affiliates/applications?application=${encodeURIComponent(conversation.affiliate_application_id)}` });
  }
  const { data: affiliateApplication } = conversation.affiliate_application_id
    ? await auth.client.from("affiliate_applications")
      .select("id, status, display_name, website, traffic_estimate, promotion_description, created_at")
      .eq("id", conversation.affiliate_application_id)
      .maybeSingle()
    : { data: null };

  const handoff = Array.isArray(conversation.handoff) ? conversation.handoff[0] : conversation.handoff;
  return NextResponse.json({
    ok: true,
    conversation: { ...conversation, audience_label: audienceLabel, handoff: handoff ?? null, customerLinks: links, affiliateApplication },
    messages: (messages ?? []).map((message) => ({
      ...message,
      sender: message.sender_type ?? message.sender ?? "system",
      content: message.message ?? message.content ?? "",
      visibility: message.visibility ?? (String(message.message ?? message.content ?? "").startsWith("[Internal note]") ? "internal" : "customer"),
    })),
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await getAdminInboxContext();
  if (!auth.ok) return auth.response;
  const { conversationId } = await params;
  const body = await request.json().catch(() => null);
  const action = body?.action;
  const now = new Date().toISOString();

  if (action === "mark_read") {
    const { error } = await auth.client.from("support_conversations").update({ unread_for_staff: false }).eq("id", conversationId);
    if (error) return NextResponse.json({ ok: false, error: "READ_STATE_UPDATE_FAILED" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "assign_to_me" || action === "unassign") {
    const assignment = {
      conversation_id: conversationId,
      assigned_agent_user_id: action === "assign_to_me" ? auth.user.id : null,
    };
    const { error } = action === "assign_to_me"
      ? await auth.client.from("support_handoffs").upsert(assignment, { onConflict: "conversation_id" })
      : await auth.client.from("support_handoffs").update(assignment).eq("conversation_id", conversationId);
    if (error) return NextResponse.json({ ok: false, error: "ASSIGNMENT_UPDATE_FAILED" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "set_status" && ["needs_reply", "waiting_customer", "closed"].includes(body?.status)) {
    const status = body.status as "needs_reply" | "waiting_customer" | "closed";
    const closed = status === "closed";
    const { error: conversationError } = await auth.client.from("support_conversations").update({
      inbox_status: status,
      unread_for_staff: false,
      status: closed ? "closed" : "handoff",
      closed_at: closed ? now : null,
      updated_at: now,
    }).eq("id", conversationId);
    const handoffUpdate = {
      conversation_id: conversationId,
      status: closed ? "closed" : "open",
      closed_at: closed ? now : null,
      resolved_at: closed ? now : null,
    };
    const { error: handoffError } = await auth.client.from("support_handoffs").upsert(handoffUpdate, { onConflict: "conversation_id" });
    if (conversationError || handoffError) {
      return NextResponse.json({ ok: false, error: "STATUS_UPDATE_FAILED" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "INVALID_ACTION" }, { status: 400 });
}

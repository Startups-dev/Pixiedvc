import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const schema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(5000),
});

export async function POST(request: Request) {
  const session = await createSupabaseServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "CHECK_SUBJECT_AND_MESSAGE" }, { status: 400 });

  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json({ ok: false, error: "SUPPORT_UNAVAILABLE" }, { status: 503 });

  // The session user ID is the only identity source. Never resolve this link from submitted email/name.
  const { data: affiliate, error: affiliateError } = await db
    .from("affiliates")
    .select("id, display_name, email, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (affiliateError) return NextResponse.json({ ok: false, error: "AFFILIATE_LOOKUP_FAILED" }, { status: 503 });
  if (!affiliate || !["active", "verified", "approved"].includes(String(affiliate.status).toLowerCase())) {
    return NextResponse.json({ ok: false, error: "AFFILIATE_ACCOUNT_REQUIRED" }, { status: 403 });
  }

  const { data: application } = await db
    .from("affiliate_applications")
    .select("id, status, created_at")
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await db
    .from("support_conversations")
    .select("id")
    .eq("affiliate_id", affiliate.id)
    .eq("guest_user_id", user.id)
    .eq("inbox_source", "support_handoff")
    .neq("inbox_status", "closed")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) return NextResponse.json({ ok: false, error: "SUPPORT_LOOKUP_FAILED" }, { status: 503 });

  let conversationId = existing?.id as string | undefined;
  if (!conversationId) {
    const { data: conversation, error } = await db
      .from("support_conversations")
      .insert({
        guest_user_id: user.id,
        guest_email: user.email.toLowerCase(),
        guest_name: String(affiliate.display_name ?? "Affiliate"),
        guest_type: "authenticated",
        topic: parsed.data.subject,
        intake_message: parsed.data.message,
        status: "handoff",
        handoff_mode: "offline",
        inbox_source: "support_handoff",
        inbox_status: "needs_reply",
        unread_for_staff: true,
        affiliate_id: affiliate.id,
        affiliate_application_id: application?.id ?? null,
        context: {
          audience: "affiliate",
          affiliate_id: affiliate.id,
          affiliate_application_id: application?.id ?? null,
          application_status: application?.status ?? null,
        },
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (error || !conversation) return NextResponse.json({ ok: false, error: "SUPPORT_CREATE_FAILED" }, { status: 503 });
    conversationId = conversation.id;
  }

  const { error: messageError } = await db.from("support_messages").insert({
    conversation_id: conversationId,
    sender: "guest",
    sender_type: "guest",
    sender_user_id: user.id,
    sender_display_name: String(affiliate.display_name ?? "Affiliate"),
    message: parsed.data.message,
    content: parsed.data.message,
    visibility: "customer",
    delivery_status: "not_applicable",
    metadata: { source: "affiliate_dashboard_support", affiliate_id: affiliate.id },
    created_at: now,
  });
  if (messageError) return NextResponse.json({ ok: false, error: "SUPPORT_MESSAGE_SAVE_FAILED" }, { status: 503 });

  const { error: handoffError } = await db.from("support_handoffs").upsert(
    { conversation_id: conversationId, status: "open" },
    { onConflict: "conversation_id" },
  );
  const { error: stateError } = await db.from("support_conversations").update({
    topic: parsed.data.subject,
    intake_message: parsed.data.message,
    status: "handoff",
    inbox_status: "needs_reply",
    unread_for_staff: true,
    closed_at: null,
    updated_at: now,
  }).eq("id", conversationId);
  if (handoffError || stateError) {
    return NextResponse.json({ ok: false, error: "SUPPORT_QUEUE_UPDATE_FAILED" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, conversationId, message: "Your message is with Hanna’s team. We’ll reply by email." });
}

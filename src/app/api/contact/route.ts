import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendPlainEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase-service-client";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  audience: z.enum(["guest", "owner", "affiliate", "other"]),
  message: z.string().trim().min(10).max(5000),
  sourcePage: z.string().trim().max(300).optional().default("/contact").refine((value) => value.startsWith("/"), "Invalid source page"),
  website: z.string().max(200).optional().default(""),
});

const WINDOW_MS = 15 * 60_000;
const LIMIT = 5;

async function checkRateLimit(request: Request, supabase: ReturnType<typeof createServiceClient>) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  const ipFingerprint = createHash("sha256").update(ip).digest("hex");
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_MS).toISOString();

  await supabase.from("contact_submission_attempts").delete().lt("created_at", new Date(now - 24 * 60 * 60_000).toISOString());
  const { count, error } = await supabase
    .from("contact_submission_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_fingerprint", ipFingerprint)
    .gte("created_at", windowStart);
  if (error) return { allowed: false, unavailable: true };
  if ((count ?? 0) >= LIMIT) return { allowed: false, unavailable: false };

  const { error: insertError } = await supabase.from("contact_submission_attempts").insert({ ip_fingerprint: ipFingerprint });
  if (insertError) return { allowed: false, unavailable: true };
  return { allowed: true, unavailable: false };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

function fingerprint(email: string, message: string) {
  return createHash("sha256")
    .update(`${email.trim().toLowerCase()}\n${message.trim().replace(/\s+/g, " ").toLowerCase()}`)
    .digest("hex");
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please check your name, email, and message." }, { status: 400 });
  }
  if (parsed.data.website.trim()) {
    return NextResponse.json({ ok: true, duplicate: false });
  }
  try {
    const supabase = createServiceClient();
    const rateLimit = await checkRateLimit(request, supabase);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: rateLimit.unavailable ? "Contact is temporarily unavailable. Please try again later." : "Too many requests. Please try again later." },
        { status: rateLimit.unavailable ? 503 : 429 },
      );
    }
    const contactFingerprint = fingerprint(parsed.data.email, parsed.data.message);
    const dedupeWindowStart = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: existing } = await supabase
      .from("support_conversations")
      .select("id, contact_ack_status, contact_staff_alert_status, created_at")
      .eq("inbox_source", "contact_form")
      .eq("contact_fingerprint", contactFingerprint)
      .gte("created_at", dedupeWindowStart)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true, acknowledgment: existing.contact_ack_status ?? "pending" });
    }

    const { data: priorFingerprint } = await supabase
      .from("support_conversations")
      .select("id, created_at")
      .eq("inbox_source", "contact_form")
      .eq("contact_fingerprint", contactFingerprint)
      .maybeSingle();
    if (priorFingerprint && new Date(priorFingerprint.created_at).getTime() < Date.now() - 10 * 60_000) {
      const { error: clearFingerprintError } = await supabase
        .from("support_conversations")
        .update({ contact_fingerprint: null })
        .eq("id", priorFingerprint.id);
      if (clearFingerprintError) {
        return NextResponse.json({ ok: false, error: "Contact is temporarily unavailable. Please try again later." }, { status: 503 });
      }
    }

    const now = new Date().toISOString();
    const { data: conversation, error: insertError } = await supabase
      .from("support_conversations")
      .insert({
        guest_email: parsed.data.email.toLowerCase(),
        guest_name: parsed.data.name,
        guest_type: "anonymous",
        topic: `Website contact · ${parsed.data.audience}`,
        intake_message: parsed.data.message,
        page_url: parsed.data.sourcePage,
        source_page: parsed.data.sourcePage,
        context: { audience: parsed.data.audience },
        status: "handoff",
        handoff_mode: "offline",
        inbox_source: "contact_form",
        inbox_status: "needs_reply",
        unread_for_staff: true,
        contact_fingerprint: contactFingerprint,
        contact_ack_status: "pending",
        contact_staff_alert_status: "pending",
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertError || !conversation) {
      if (insertError?.code === "23505") {
        const { data: duplicate } = await supabase
          .from("support_conversations")
          .select("id, contact_ack_status, created_at")
          .eq("inbox_source", "contact_form")
          .eq("contact_fingerprint", contactFingerprint)
          .gte("created_at", dedupeWindowStart)
          .maybeSingle();
        if (duplicate) return NextResponse.json({ ok: true, duplicate: true, acknowledgment: duplicate.contact_ack_status ?? "pending" });
      }
      console.error("[contact] inquiry persistence failed", { code: insertError?.code ?? null });
      return NextResponse.json({ ok: false, error: "We could not save your message. Please try again." }, { status: 503 });
    }

    const { error: handoffError } = await supabase.from("support_handoffs").upsert(
      { conversation_id: conversation.id, status: "open" },
      { onConflict: "conversation_id" },
    );
    const { error: messageError } = await supabase.from("support_messages").insert({
      conversation_id: conversation.id,
      sender: "guest",
      sender_type: "guest",
      sender_display_name: parsed.data.name,
      message: parsed.data.message,
      content: parsed.data.message,
      visibility: "customer",
      metadata: { source: "public_contact_form", audience: parsed.data.audience },
      created_at: now,
    });
    if (handoffError || messageError) {
      console.error("[contact] inquiry linkage failed", { conversationId: conversation.id, handoffFailed: Boolean(handoffError), messageFailed: Boolean(messageError) });
    }

    const staffAddress = process.env.CONCIERGE_HANDOFF_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "hello@hannadvc.com";
    const escapedName = escapeHtml(parsed.data.name);
    const escapedMessage = escapeHtml(parsed.data.message).replace(/\n/g, "<br>");
    const sendResults = await Promise.allSettled([
      sendPlainEmail({
        to: parsed.data.email,
        subject: "We received your HannaDVC message",
        body: `Hi ${parsed.data.name},\n\nThanks for reaching out. Our team has received your message and will follow up.\n\nHannaDVC Support`,
        html: `<p>Hi ${escapedName},</p><p>Thanks for reaching out. Our team has received your message and will follow up.</p><p>HannaDVC Support</p>`,
        context: "public contact acknowledgment",
        templateKey: "public_contact_acknowledgment",
        replyTo: "hello@hannadvc.com",
        relatedEntityType: "support_conversation",
        relatedEntityId: conversation.id,
        metadata: { conversation_id: conversation.id, source: "public_contact_form", inbox_email_threading: true },
      }),
      sendPlainEmail({
        to: staffAddress,
        subject: "New HannaDVC website inquiry",
        body: `New ${parsed.data.audience} inquiry from ${parsed.data.name} <${parsed.data.email}>:\n\n${parsed.data.message}\n\nOpen /admin/inbox`,
        html: `<p>New ${escapeHtml(parsed.data.audience)} inquiry from <strong>${escapedName}</strong> &lt;${escapeHtml(parsed.data.email)}&gt;:</p><p>${escapedMessage}</p><p>Open the Admin Inbox to reply.</p>`,
        context: "public contact staff alert",
        templateKey: "public_contact_staff_alert",
        relatedEntityType: "support_conversation",
        relatedEntityId: conversation.id,
        metadata: { conversation_id: conversation.id, source: "public_contact_form" },
      }),
    ]);
    const acknowledgmentStatus = sendResults[0].status === "fulfilled" && sendResults[0].value.status === "sent" ? "sent" : "failed";
    const staffAlertStatus = sendResults[1].status === "fulfilled" && sendResults[1].value.status === "sent" ? "sent" : "failed";
    const { error: statusError } = await supabase.from("support_conversations").update({
      contact_ack_status: acknowledgmentStatus,
      contact_staff_alert_status: staffAlertStatus,
      updated_at: now,
    }).eq("id", conversation.id);
    if (statusError) console.error("[contact] notification state save failed", { conversationId: conversation.id });

    return NextResponse.json({
      ok: true,
      duplicate: false,
      acknowledgment: acknowledgmentStatus,
      staffAlert: staffAlertStatus,
      notificationStateSaved: !statusError,
      queueLinked: !handoffError && !messageError,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "We could not process your message. Please try again." }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendAffiliateApplicationAcknowledgment, sendAffiliateApplicationStaffAlert } from "@/lib/affiliate-emails";

type ApplicationPayload = {
  fullName?: string;
  email?: string;
  websiteOrChannelUrl?: string;
  website?: string;
  socialLink?: string;
  social?: string;
  promotionPlan?: string;
  promotion_description?: string;
  trafficEstimate?: string;
  agreed?: boolean;
  termsAccepted?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function POST(request: Request) {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server misconfigured: missing service role client" },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as ApplicationPayload | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const fullName = body.fullName?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const website = (body.websiteOrChannelUrl ?? body.website ?? "").trim();
  const socialLink = (body.socialLink ?? body.social ?? "").trim();
  const promotionPlan = (body.promotionPlan ?? body.promotion_description ?? "").trim();
  const trafficEstimate = body.trafficEstimate?.trim() || null;
  const agreed = Boolean(body.agreed ?? body.termsAccepted ?? true);

  if (!fullName || !email || !EMAIL_RE.test(email) || !website || !promotionPlan) {
    return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
  }

  if (!agreed) {
    return NextResponse.json({ error: "You must accept the terms and conditions." }, { status: 400 });
  }

  const { data: existingApplication, error: existingErr } = await admin
    .from("affiliate_applications")
    .select("id, status")
    .eq("email", email)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 400 });
  }

  if (existingApplication?.id) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      message: "Your application has already been received.",
    });
  }

  const displayName = fullName || email;
  const { data: application, error } = await admin.from("affiliate_applications").insert({
    status: "pending",
    display_name: displayName,
    email,
    website,
    social_links: socialLink ? [socialLink] : [],
    traffic_estimate: trafficEstimate,
    promotion_description: promotionPlan,
    admin_notes: null,
    terms_accepted_at: new Date().toISOString(),
  }).select("id").single();

  if (error?.code === "23505") {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      message: "Your application has already been received.",
    });
  }

  if (error || !application) {
    return NextResponse.json({ error: error?.message ?? "Unable to save application." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: conversation, error: conversationError } = await admin
    .from("support_conversations")
    .insert({
      guest_email: email,
      guest_name: displayName,
      guest_type: "anonymous",
      topic: `Affiliate application · ${displayName}`,
      intake_message: promotionPlan,
      source_page: "/partners/affiliate-program",
      page_url: "/partners/affiliate-program",
      context: { audience: "affiliate", affiliate_application_id: application.id },
      status: "handoff",
      handoff_mode: "offline",
      inbox_source: "contact_form",
      inbox_status: "needs_reply",
      unread_for_staff: true,
      affiliate_application_id: application.id,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .maybeSingle();
  const conversationId = conversation?.id ?? null;
  if (conversationId) {
    const [handoff, message] = await Promise.all([
      admin.from("support_handoffs").upsert({ conversation_id: conversationId, status: "open" }, { onConflict: "conversation_id" }),
      admin.from("support_messages").insert({
        conversation_id: conversationId,
        sender: "guest",
        sender_type: "guest",
        sender_display_name: displayName,
        message: promotionPlan,
        content: promotionPlan,
        visibility: "customer",
        delivery_status: "not_applicable",
        metadata: { source: "affiliate_application", affiliate_application_id: application.id },
        created_at: now,
      }),
    ]);
    if (handoff.error || message.error) {
      console.error("[affiliate-application] inbox linkage failed", { applicationId: application.id });
    }
  } else {
    console.error("[affiliate-application] inbox conversation creation failed", { applicationId: application.id, code: conversationError?.code ?? null });
  }

  const staffAddress = process.env.CONCIERGE_HANDOFF_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "hello@hannadvc.com";
  const [acknowledgment, staffAlert] = await Promise.allSettled([
    sendAffiliateApplicationAcknowledgment({ to: email, name: displayName, applicationId: application.id, conversationId }),
    sendAffiliateApplicationStaffAlert({ to: staffAddress, applicantName: displayName, applicationId: application.id }),
  ]);
  const acknowledgmentAccepted = acknowledgment.status === "fulfilled" && acknowledgment.value.status === "sent";
  const staffAlertAccepted = staffAlert.status === "fulfilled" && staffAlert.value.status === "sent";

  return NextResponse.json({
    ok: true,
    status: "pending",
    message: "Application submitted.",
    notifications: { applicantAcknowledgment: acknowledgmentAccepted ? "accepted" : "failed", staffAlert: staffAlertAccepted ? "accepted" : "failed" },
  }, { status: 201 });
}

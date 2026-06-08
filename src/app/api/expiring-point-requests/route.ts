import { NextResponse } from "next/server";
import { z } from "zod";

import { sendPlainEmail } from "@/lib/email";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const bodySchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(60).nullable().optional(),
  resort: z.string().trim().min(1).max(200),
  points: z.number().int().positive().max(5000),
  expirationDate: z.string().trim().min(1).max(30),
  reservationDetails: z.string().trim().max(4000).nullable().optional(),
  desiredPayout: z.string().trim().min(1).max(200),
  urgency: z.enum(["flexible", "within_60_days", "within_30_days", "immediate"]),
  notes: z.string().trim().max(4000).nullable().optional(),
  acknowledged: z.literal(true),
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatUrgency(value: z.infer<typeof bodySchema>["urgency"]) {
  switch (value) {
    case "within_60_days":
      return "Within 60 Days";
    case "within_30_days":
      return "Within 30 Days";
    case "immediate":
      return "Immediate";
    default:
      return "Flexible";
  }
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const expirationDate = new Date(parsed.data.expirationDate);
  if (Number.isNaN(expirationDate.getTime())) {
    return NextResponse.json({ error: "Expiration date is invalid." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const { data, error } = await admin
    .from("expiring_point_requests")
    .insert({
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      resort: parsed.data.resort,
      points: parsed.data.points,
      expiration_date: parsed.data.expirationDate,
      reservation_details: parsed.data.reservationDetails ?? null,
      desired_payout: parsed.data.desiredPayout,
      urgency: parsed.data.urgency,
      notes: parsed.data.notes ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Unable to save request." }, { status: 400 });
  }

  const adminRecipient = process.env.CONCIERGE_HANDOFF_EMAIL ?? "hello@pixiedvc.com";
  const urgencyLabel = formatUrgency(parsed.data.urgency);
  const lines = [
    `Full Name: ${parsed.data.fullName}`,
    `Email: ${parsed.data.email}`,
    `Phone: ${parsed.data.phone || "—"}`,
    `Home Resort: ${parsed.data.resort}`,
    `Number of Points: ${parsed.data.points}`,
    `Expiration Date: ${parsed.data.expirationDate}`,
    `Confirmed Reservation Details: ${parsed.data.reservationDetails || "—"}`,
    `Desired Owner Payout: ${parsed.data.desiredPayout}`,
    `Urgency: ${urgencyLabel}`,
    `Notes: ${parsed.data.notes || "—"}`,
    `Status: pending`,
  ];

  const adminBody = `A new expiring points request has been submitted.\n\n${lines.join("\n")}`;
  const adminHtml = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#102554;">
      <h2 style="margin:0 0 16px;">New Expiring Points Request</h2>
      <p style="margin:0 0 16px;">A new expiring points request has been submitted.</p>
      <ul style="padding-left:18px;margin:0;">
        ${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
      </ul>
    </div>
  `;

  const ownerBody = [
    `Hi ${parsed.data.fullName},`,
    "",
    "Thank you for reaching out to PixieDVC.",
    "",
    "We received your request and our team will review the opportunity. If it appears to be a fit, we may reach out for additional details or next steps.",
    "",
    "Please note that submission does not guarantee placement, booking, or sale.",
    "",
    "— PixieDVC",
  ].join("\n");
  const ownerHtml = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#102554;">
      <p>Hi ${escapeHtml(parsed.data.fullName)},</p>
      <p>Thank you for reaching out to PixieDVC.</p>
      <p>We received your request and our team will review the opportunity. If it appears to be a fit, we may reach out for additional details or next steps.</p>
      <p>Please note that submission does not guarantee placement, booking, or sale.</p>
      <p>— PixieDVC</p>
    </div>
  `;

  const emailResults = await Promise.allSettled([
    sendPlainEmail({
      to: adminRecipient,
      subject: "New Expiring Points Request",
      body: adminBody,
      html: adminHtml,
      context: "expiring points admin notification",
      templateKey: "expiring-point-request-admin-notification",
      relatedEntityType: "expiring_point_request",
      relatedEntityId: data.id,
      metadata: { request_id: data.id, email: parsed.data.email, urgency: parsed.data.urgency },
    }),
    sendPlainEmail({
      to: parsed.data.email,
      subject: "We Received Your Request",
      body: ownerBody,
      html: ownerHtml,
      context: "expiring points owner confirmation",
      templateKey: "expiring-point-request-owner-confirmation",
      relatedEntityType: "expiring_point_request",
      relatedEntityId: data.id,
      metadata: { request_id: data.id, email: parsed.data.email },
    }),
  ]);

  emailResults.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("[expiring-point-requests] email send failed", {
        requestId: data.id,
        recipient: index === 0 ? adminRecipient : parsed.data.email,
        message: result.reason instanceof Error ? result.reason.message : "unknown_error",
      });
    }
  });

  return NextResponse.json({ ok: true, id: data.id });
}

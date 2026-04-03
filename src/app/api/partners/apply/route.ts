import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";

type PartnershipType = "advisor" | "affiliate" | "service";

type PartnerApplyPayload = {
  name?: string;
  email?: string;
  phone?: string | null;
  partnershipType?: PartnershipType;
  businessName?: string;
  websiteOrSocial?: string | null;
  description?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPartnershipType(value: unknown): value is PartnershipType {
  return value === "advisor" || value === "affiliate" || value === "service";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PartnerApplyPayload | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const phone = body.phone?.trim() ?? null;
  const partnershipType = body.partnershipType;
  const businessName = body.businessName?.trim() ?? "";
  const websiteOrSocial = body.websiteOrSocial?.trim() ?? null;
  const description = body.description?.trim() ?? "";

  if (!name || !email || !businessName || !description || !isPartnershipType(partnershipType)) {
    return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const topic = `partner_application:${partnershipType}`;
  const formattedMessage = [
    `Partnership Type: ${partnershipType}`,
    `Business/Brand: ${businessName}`,
    `Phone: ${phone ?? "Not provided"}`,
    `Website/Social: ${websiteOrSocial ?? "Not provided"}`,
    "",
    description,
  ].join("\n");

  const { data: conversation, error: conversationError } = await supabase
    .from("support_conversations")
    .insert({
      guest_email: email,
      status: "open",
      page_url: "/partners/apply",
      source_page: "/partners/apply",
      guest_name: name,
      guest_type: "anonymous",
      topic,
      intake_message: formattedMessage,
      context: {
        source: "partner_apply_form",
        partnership_type: partnershipType,
      },
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (conversationError || !conversation) {
    return NextResponse.json(
      { error: conversationError?.message ?? "Unable to submit application." },
      { status: 500 },
    );
  }

  await supabase.from("support_messages").insert({
    conversation_id: conversation.id,
    sender: "guest",
    sender_type: "guest",
    sender_display_name: name,
    message: formattedMessage,
    content: formattedMessage,
    metadata: {
      partnership_type: partnershipType,
      business_name: businessName,
      phone,
      website_or_social: websiteOrSocial,
    },
  });

  await supabase.from("support_handoffs").insert({
    conversation_id: conversation.id,
    status: "open",
  });

  return NextResponse.json({
    ok: true,
    message: "Application submitted. Our team will follow up shortly.",
  });
}

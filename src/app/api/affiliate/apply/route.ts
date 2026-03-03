import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

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
      status: existingApplication.status ?? "pending",
      message: "Application already received. We will review it shortly.",
    });
  }

  const displayName = fullName || email;
  const { error } = await admin.from("affiliate_applications").insert({
    status: "pending",
    display_name: displayName,
    email,
    website,
    social_links: socialLink ? [socialLink] : [],
    traffic_estimate: trafficEstimate,
    promotion_description: promotionPlan,
    admin_notes: null,
    terms_accepted_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    status: "pending",
    message: "Application submitted. We review applications within 48 hours.",
  });
}

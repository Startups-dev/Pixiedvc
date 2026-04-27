import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type EmailLeadSource = "hero_bar" | "post_intent" | "resort_section" | "bottom_cta";

type EmailLeadPayload = {
  email?: string;
  source?: EmailLeadSource;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SOURCES = new Set<EmailLeadSource>(["hero_bar", "post_intent", "resort_section", "bottom_cta"]);

export async function POST(request: Request) {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured: missing service role client" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as EmailLeadPayload | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const source = body.source;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!source || !VALID_SOURCES.has(source)) {
    return NextResponse.json({ error: "Invalid lead source." }, { status: 400 });
  }

  const { error } = await admin.from("email_leads").upsert(
    {
      email,
      source,
    },
    {
      onConflict: "email,source",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

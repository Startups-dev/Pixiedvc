import { NextResponse } from "next/server";

import { getAppBaseUrl } from "@/lib/app-url";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const NEUTRAL_MESSAGE = "If this email is approved, password reset instructions have been sent.";
const APPROVED_AFFILIATE_STATUSES = new Set(["verified", "active", "approved"]);

function isApprovedAffiliateStatus(status: unknown) {
  return APPROVED_AFFILIATE_STATUSES.has(String(status ?? "").toLowerCase());
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  const redirectTo =
    typeof payload?.redirectTo === "string" && payload.redirectTo.startsWith("/affiliate/")
      ? payload.redirectTo
      : "/affiliate/login?mode=update";

  if (!email) {
    return NextResponse.json({ message: NEUTRAL_MESSAGE });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ message: NEUTRAL_MESSAGE });
  }

  const { data: affiliate } = await adminClient
    .from("affiliates")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (!affiliate?.id || !isApprovedAffiliateStatus(affiliate.status)) {
    return NextResponse.json({ message: NEUTRAL_MESSAGE });
  }

  const supabase = await createSupabaseServerClient();
  const appBaseUrl = getAppBaseUrl() ?? new URL(request.url).origin;
  const callbackUrl = new URL("/auth/callback", appBaseUrl);
  callbackUrl.searchParams.set("next", redirectTo);

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl.toString(),
  });

  return NextResponse.json({ message: NEUTRAL_MESSAGE });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const payout_email = typeof payload?.payout_email === "string" ? payload.payout_email.trim() : null;

  const { data: affiliate } = await authClient
    .from("affiliates")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!affiliate) {
    return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
  }

  const client = getSupabaseAdminClient() ?? authClient;
  const { error } = await client
    .from("affiliates")
    .update({ payout_email })
    .eq("id", affiliate.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

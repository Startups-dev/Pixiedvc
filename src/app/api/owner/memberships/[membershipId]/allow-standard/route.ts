import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const { membershipId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(membershipId)) {
    return NextResponse.json({ error: "Invalid membership id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
  }

  const { data: membership, error: membershipError } = await adminClient
    .from("owner_memberships")
    .select("id, owner_id")
    .eq("id", membershipId)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  if (!membership || membership.owner_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error: updateError } = await adminClient
    .from("owner_memberships")
    .update({
      matching_mode: "premium_then_standard",
      allow_standard_rate_fallback: true,
      fallback_remind_at: null,
    })
    .eq("id", membershipId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

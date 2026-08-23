import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isOwnerLifecycleActive } from "@/lib/owner/lifecycle";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ownerMembershipId = body?.owner_membership_id;
  const reason = body?.reason ?? null;

  if (!ownerMembershipId) {
    return NextResponse.json({ error: "owner_membership_id required" }, { status: 400 });
  }

  const { data: ownerRecord, error: ownerRecordError } = await supabase
    .from("owners")
    .select("id, lifecycle_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (ownerRecordError) {
    return NextResponse.json({ error: "owner_status_unavailable" }, { status: 500 });
  }

  if (!isOwnerLifecycleActive(ownerRecord)) {
    return NextResponse.json({ error: "owner_inactive" }, { status: 403 });
  }

  const { error } = await supabase.from("concierge_liquidation_intents").insert({
    owner_id: user.id,
    owner_membership_id: ownerMembershipId,
    reason,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

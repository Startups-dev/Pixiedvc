import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  { params }: { params: { membershipId: string } },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .or(`user_id.eq.${user.id},id.eq.${user.id}`)
    .maybeSingle();

  if (!owner) {
    return NextResponse.json({ error: "owner_not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const reason = body?.reason ?? null;
  const rawAmount = Number(body?.banked_points_amount);
  const bankedPointsAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? Math.floor(rawAmount) : 0;
  const membershipId = params.membershipId;

  const { data: membership } = await supabase
    .from("owner_memberships")
    .select("id, owner_id")
    .eq("id", membershipId)
    .maybeSingle();

  if (!membership || membership.owner_id !== owner.id) {
    return NextResponse.json({ error: "membership_not_found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("owner_memberships")
    .update({
      banked_assumed_at: new Date().toISOString(),
      banked_assumed_reason: reason,
      banked_points_amount: bankedPointsAmount,
      expired_assumed_at: null,
    })
    .eq("id", membershipId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("owner_points_events").insert({
    owner_id: owner.id,
    owner_membership_id: membershipId,
    event_type: "banked_points",
    points_amount: bankedPointsAmount,
    note: reason,
  });

  return NextResponse.json({ ok: true, reason });
}

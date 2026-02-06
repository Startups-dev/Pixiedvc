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
  const eventType = body?.event_type;
  const pointsAmount = Number.isFinite(Number(body?.points_amount))
    ? Math.max(Number(body?.points_amount), 0)
    : null;
  const note = body?.note ?? null;

  if (!eventType) {
    return NextResponse.json({ error: "event_type required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("owner_memberships")
    .select("id, owner_id")
    .eq("id", params.membershipId)
    .maybeSingle();

  if (!membership || membership.owner_id !== owner.id) {
    return NextResponse.json({ error: "membership_not_found" }, { status: 404 });
  }

  const { error } = await supabase.from("owner_points_events").insert({
    owner_id: owner.id,
    owner_membership_id: params.membershipId,
    event_type: eventType,
    points_amount: pointsAmount,
    note,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

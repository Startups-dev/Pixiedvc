import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { expireMatchAndReleasePoints } from "@/lib/matches/expire";

export async function POST(
  request: Request,
  { params }: { params: { matchId: string } },
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Service role key not configured");
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  const { data: owner } = await adminClient
    .from("owners")
    .select("id, user_id")
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  if (!owner) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 404 });
  }

  const { data: match } = await adminClient
    .from("booking_matches")
    .select("id, status, booking_id, owner_id, owner_membership_id, points_reserved, points_reserved_current, points_reserved_borrowed, created_at, expires_at")
    .eq("id", params.matchId)
    .eq("owner_id", owner.id)
    .maybeSingle();

  if (!match) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 404 });
  }

  const now = new Date();
  const expiresAt = match.expires_at
    ? new Date(match.expires_at)
    : new Date(new Date(match.created_at).getTime() + 60 * 60 * 1000);
  const nowIso = now.toISOString();

  if (now < expiresAt) {
    return NextResponse.json({ error: "not_expired" }, { status: 409 });
  }

  await expireMatchAndReleasePoints({
    adminClient,
    match,
    nowIso,
  });

  return NextResponse.json({ ok: true });
}

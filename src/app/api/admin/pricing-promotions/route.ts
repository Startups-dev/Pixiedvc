import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const sessionClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role unavailable" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  const query = adminClient
    .from("pricing_promotions")
    .select(
      "id, name, is_active, starts_at, ends_at, enrollment_required, guest_max_reward_per_point_cents, owner_max_bonus_per_point_cents, min_spread_per_point_cents, created_at",
    );

  const { data, error } = name
    ? await query.eq("name", name).maybeSingle()
    : await query.eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (error) {
    console.error("Failed to load pricing promotion", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json({ error: "Unable to load promotion" }, { status: 500 });
  }

  return NextResponse.json({ promotion: data ?? null });
}

export async function POST(request: Request) {
  const sessionClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role unavailable" }, { status: 500 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name : null;
  const isActive = body?.is_active;

  if (!name || typeof isActive !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("pricing_promotions")
    .update({ is_active: isActive })
    .eq("name", name)
    .select(
      "id, name, is_active, starts_at, ends_at, enrollment_required, guest_max_reward_per_point_cents, owner_max_bonus_per_point_cents, min_spread_per_point_cents, created_at",
    )
    .maybeSingle();

  if (error) {
    console.error("Failed to update pricing promotion", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json({ error: "Unable to update promotion" }, { status: 500 });
  }

  return NextResponse.json({ promotion: data ?? null });
}

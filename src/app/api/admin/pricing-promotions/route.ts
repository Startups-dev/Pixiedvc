import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getEffectivePromotionStatus, type PricingPromotion } from "@/lib/pricing-promotions";

function serializePromotion(data: PricingPromotion) {
  const effective = getEffectivePromotionStatus(data, new Date());
  return {
    ...data,
    is_effective_active: effective.isEffectiveActive,
    effective_reason: effective.reason,
  };
}

function parseOptionalTimestamp(value: unknown) {
  if (value == null || value === "") {
    return { value: null, error: null as string | null };
  }
  if (typeof value !== "string") {
    return { value: null, error: "Invalid date value." };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { value: null, error: "Invalid date value." };
  }

  return { value: parsed.toISOString(), error: null as string | null };
}

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

  if (!data) {
    return NextResponse.json({ promotion: null });
  }

  return NextResponse.json({
    promotion: serializePromotion(data as PricingPromotion),
  });
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
  const startsAt = parseOptionalTimestamp(body?.starts_at);
  const endsAt = parseOptionalTimestamp(body?.ends_at);

  if (!name) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (isActive !== undefined && typeof isActive !== "boolean") {
    return NextResponse.json({ error: "Invalid active flag." }, { status: 400 });
  }
  if (startsAt.error || endsAt.error) {
    return NextResponse.json({ error: startsAt.error ?? endsAt.error }, { status: 400 });
  }
  if (startsAt.value && endsAt.value && new Date(endsAt.value) <= new Date(startsAt.value)) {
    return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });
  }

  const updates: Partial<PricingPromotion> = {};
  if (isActive !== undefined) {
    updates.is_active = isActive;
  }
  if (body && "starts_at" in body) {
    updates.starts_at = startsAt.value;
  }
  if (body && "ends_at" in body) {
    updates.ends_at = endsAt.value;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("pricing_promotions")
    .update(updates)
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

  if (!data) {
    return NextResponse.json({ promotion: null });
  }

  return NextResponse.json({
    promotion: serializePromotion(data as PricingPromotion),
  });
}

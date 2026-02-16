import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type PricingPromotion = {
  id: string;
  name: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  enrollment_required: boolean;
  guest_max_reward_per_point_cents: number;
  owner_max_bonus_per_point_cents: number;
  min_spread_per_point_cents: number;
  created_at: string;
};

function isWithinWindow(row: PricingPromotion, now: Date) {
  if (!row.is_active) return false;
  if (row.starts_at) {
    const starts = new Date(row.starts_at);
    if (!Number.isNaN(starts.getTime()) && now < starts) return false;
  }
  if (row.ends_at) {
    const ends = new Date(row.ends_at);
    if (!Number.isNaN(ends.getTime()) && now > ends) return false;
  }
  return true;
}

export async function getActivePromotion(params?: { adminClient?: SupabaseClient }) {
  const adminClient = params?.adminClient ?? getSupabaseAdminClient();
  if (!adminClient) {
    return { data: null, error: new Error("Missing admin client") };
  }

  const { data, error } = await adminClient
    .from("pricing_promotions")
    .select(
      "id, name, is_active, starts_at, ends_at, enrollment_required, guest_max_reward_per_point_cents, owner_max_bonus_per_point_cents, min_spread_per_point_cents, created_at",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error: error ?? null };
  }

  const promotion = data as PricingPromotion;
  if (!isWithinWindow(promotion, new Date())) {
    return { data: null, error: null };
  }

  return { data: promotion, error: null };
}

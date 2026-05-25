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

export type PromotionEffectiveStatusReason =
  | "active"
  | "inactive_flag"
  | "starts_in_future"
  | "ended"
  | "invalid_start"
  | "invalid_end";

export function getEffectivePromotionStatus(row: PricingPromotion, now: Date) {
  if (!row.is_active) {
    return { isEffectiveActive: false, reason: "inactive_flag" as const };
  }

  if (row.starts_at) {
    const starts = new Date(row.starts_at);
    if (Number.isNaN(starts.getTime())) {
      return { isEffectiveActive: false, reason: "invalid_start" as const };
    }
    if (now < starts) {
      return { isEffectiveActive: false, reason: "starts_in_future" as const };
    }
  }
  if (row.ends_at) {
    const ends = new Date(row.ends_at);
    if (Number.isNaN(ends.getTime())) {
      return { isEffectiveActive: false, reason: "invalid_end" as const };
    }
    if (now > ends) {
      return { isEffectiveActive: false, reason: "ended" as const };
    }
  }
  return { isEffectiveActive: true, reason: "active" as const };
}

export function getFirstActivePromotionWithinWindow(promotions: PricingPromotion[], now: Date) {
  return promotions.find((promotion) => getEffectivePromotionStatus(promotion, now).isEffectiveActive) ?? null;
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
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return { data: null, error: error ?? null };
  }

  const promotion = getFirstActivePromotionWithinWindow(data as PricingPromotion[], new Date());

  return { data: promotion, error: null };
}

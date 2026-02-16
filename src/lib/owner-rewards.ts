import type { SupabaseClient } from "@supabase/supabase-js";
import { getActivePromotion } from "@/lib/pricing-promotions";

export type OwnerPreferredTier = "base" | "tier1" | "tier2" | "tier3" | "tier4";

export function getOwnerPreferredBonusCents(lifetimePointsRented: number) {
  if (lifetimePointsRented < 300) return 0;
  if (lifetimePointsRented < 600) return 50;
  if (lifetimePointsRented < 1000) return 100;
  if (lifetimePointsRented < 1500) return 150;
  return 200;
}

export function getOwnerPreferredTier(lifetimePointsRented: number): OwnerPreferredTier {
  if (lifetimePointsRented < 300) return "base";
  if (lifetimePointsRented < 600) return "tier1";
  if (lifetimePointsRented < 1000) return "tier2";
  if (lifetimePointsRented < 1500) return "tier3";
  return "tier4";
}

export function applyOwnerBonusWithMargin(params: {
  owner_bonus_candidate_cents: number;
  owner_max_bonus_cents: number;
  guest_reward_per_point_cents: number;
  spread_per_point_cents: number;
  min_spread_per_point_cents: number;
}) {
  const {
    owner_bonus_candidate_cents,
    owner_max_bonus_cents,
    guest_reward_per_point_cents,
    spread_per_point_cents,
    min_spread_per_point_cents,
  } = params;

  const maxBonusByFloor = Math.max(
    0,
    spread_per_point_cents - guest_reward_per_point_cents - min_spread_per_point_cents,
  );

  return Math.min(owner_bonus_candidate_cents, owner_max_bonus_cents, maxBonusByFloor);
}

export function isOwnerRewardsEnrolled(profile: { owner_rewards_enrolled_at?: string | null } | null) {
  return Boolean(profile?.owner_rewards_enrolled_at);
}

async function getOwnerEnrollmentFlag(adminClient: SupabaseClient) {
  const { data, error } = await adminClient
    .from("app_settings")
    .select("value")
    .eq("key", "promotions_owner_enrollment_enabled")
    .maybeSingle();

  if (error) {
    return { enabled: true, error };
  }

  const value = (data?.value ?? null) as { enabled?: boolean } | null;
  return { enabled: value?.enabled ?? true, error: null };
}

export async function maybeEnrollOwnerRewardsForRental(params: {
  adminClient: SupabaseClient;
  rentalId: string;
}) {
  const { adminClient, rentalId } = params;

  const { data: rental, error: rentalError } = await adminClient
    .from("rentals")
    .select("id, owner_user_id")
    .eq("id", rentalId)
    .maybeSingle();

  if (rentalError || !rental?.owner_user_id) {
    return { enrolled: false, error: rentalError ?? null };
  }

  const { enabled, error: flagError } = await getOwnerEnrollmentFlag(adminClient);
  if (flagError) {
    return { enrolled: false, error: flagError };
  }

  if (!enabled) {
    console.info("[owner-rewards] enrollment blocked (flag off)", {
      rental_id: rentalId,
      owner_user_id: rental.owner_user_id,
    });
    return { enrolled: false, error: null };
  }

  const { data: activePromotion, error: promoError } = await getActivePromotion({ adminClient });
  if (promoError) {
    return { enrolled: false, error: promoError };
  }

  if (!activePromotion) {
    console.info("[owner-rewards] enrollment blocked (no active promotion)", {
      rental_id: rentalId,
      owner_user_id: rental.owner_user_id,
    });
    return { enrolled: false, error: null };
  }

  const { data: updated, error } = await adminClient
    .from("profiles")
    .update({ owner_rewards_enrolled_at: new Date().toISOString() })
    .eq("id", rental.owner_user_id)
    .is("owner_rewards_enrolled_at", null)
    .select("owner_rewards_enrolled_at")
    .maybeSingle();

  if (error) {
    return { enrolled: false, error };
  }

  return { enrolled: Boolean(updated?.owner_rewards_enrolled_at), error: null };
}

export async function sumOwnerCompletedPoints(params: {
  adminClient: SupabaseClient;
  ownerUserId: string;
}) {
  const { adminClient, ownerUserId } = params;

  const { data: rentals, error: rentalsError } = await adminClient
    .from("rentals")
    .select("id, points_required")
    .eq("owner_user_id", ownerUserId);

  if (rentalsError) {
    return { points: 0, error: rentalsError };
  }

  const rentalIds = (rentals ?? []).map((row) => row.id).filter(Boolean);
  if (rentalIds.length === 0) {
    return { points: 0, error: null };
  }

  const { data: completedRows, error } = await adminClient
    .from("rental_milestones")
    .select("rental_id")
    .eq("code", "check_out")
    .eq("status", "completed")
    .in("rental_id", rentalIds);

  if (error) {
    return { points: 0, error };
  }

  const completedSet = new Set((completedRows ?? []).map((row) => row.rental_id));
  const points = (rentals ?? []).reduce((total, rental) => {
    if (!completedSet.has(rental.id)) return total;
    const value = Number(rental.points_required ?? 0);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);

  return { points, error: null };
}

export async function recordOwnerCompletedRental(params: {
  adminClient: SupabaseClient;
  ownerId: string;
  pointsRequired: number;
}) {
  const { adminClient, ownerId, pointsRequired } = params;

  const { data: existing, error: existingError } = await adminClient
    .from("owner_rewards_stats")
    .select("owner_id, lifetime_points_rented")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError };
  }

  const currentPoints = Number(existing?.lifetime_points_rented ?? 0);
  const nextPoints = currentPoints + Math.max(pointsRequired, 0);
  const tier = getOwnerPreferredTier(nextPoints);

  const { error } = await adminClient
    .from("owner_rewards_stats")
    .upsert(
      {
        owner_id: ownerId,
        lifetime_points_rented: nextPoints,
        tier,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" },
    );

  return { error };
}

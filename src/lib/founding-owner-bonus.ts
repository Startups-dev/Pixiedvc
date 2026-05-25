import type { SupabaseClient } from "@supabase/supabase-js";

import { isFoundingOwnerLaunchPromotion } from "@/lib/founding-owner-launch";
import { getActivePromotion, type PricingPromotion } from "@/lib/pricing-promotions";
import type { OwnerPayoutResult } from "@/lib/pricing";

export const FOUNDING_OWNER_BONUS_CENTS_PER_POINT = 200;
export const FOUNDING_OWNER_BONUS_TERM_YEARS = 2;

export type FoundingOwnerBonusFields = {
  founding_owner_bonus_cents_per_point?: number | null;
  founding_owner_bonus_started_at?: string | null;
  founding_owner_bonus_expires_at?: string | null;
  founding_owner_granted_at?: string | null;
  founding_owner_promotion_id?: string | null;
};

type FoundingOwnerRecord = FoundingOwnerBonusFields & {
  id: string;
};

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

export function hasFoundingOwnerGrant(owner: FoundingOwnerBonusFields | null | undefined) {
  return Boolean(
    owner?.founding_owner_granted_at ||
      owner?.founding_owner_bonus_started_at ||
      owner?.founding_owner_promotion_id ||
      Number(owner?.founding_owner_bonus_cents_per_point ?? 0) > 0,
  );
}

export function getActiveFoundingOwnerBonusCents(
  owner: FoundingOwnerBonusFields | null | undefined,
  now = new Date(),
) {
  const cents = Number(owner?.founding_owner_bonus_cents_per_point ?? 0);
  if (!Number.isFinite(cents) || cents <= 0) return 0;

  if (owner?.founding_owner_bonus_started_at) {
    const startsAt = new Date(owner.founding_owner_bonus_started_at);
    if (Number.isNaN(startsAt.getTime()) || now < startsAt) {
      return 0;
    }
  }

  if (!owner?.founding_owner_bonus_expires_at) return 0;
  const expiresAt = new Date(owner.founding_owner_bonus_expires_at);
  if (Number.isNaN(expiresAt.getTime()) || now >= expiresAt) {
    return 0;
  }

  return cents;
}

export function isActiveFoundingOwner(
  owner: FoundingOwnerBonusFields | null | undefined,
  now = new Date(),
) {
  const cents = Number(owner?.founding_owner_bonus_cents_per_point ?? 0);
  if (!Number.isFinite(cents) || cents <= 0) return false;

  if (!owner?.founding_owner_bonus_expires_at) {
    return true;
  }

  const expiresAt = new Date(owner.founding_owner_bonus_expires_at);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return now < expiresAt;
}

export function buildFoundingOwnerGrantUpdate(params: {
  owner: FoundingOwnerBonusFields | null | undefined;
  activePromotion: PricingPromotion | null | undefined;
  now?: Date;
}) {
  const { owner, activePromotion } = params;
  const now = params.now ?? new Date();

  if (hasFoundingOwnerGrant(owner)) {
    return null;
  }

  if (!activePromotion || !isFoundingOwnerLaunchPromotion(activePromotion)) {
    return null;
  }

  const grantedAt = now.toISOString();
  const expiresAt = addYears(now, FOUNDING_OWNER_BONUS_TERM_YEARS).toISOString();

  return {
    founding_owner_bonus_cents_per_point: FOUNDING_OWNER_BONUS_CENTS_PER_POINT,
    founding_owner_bonus_started_at: grantedAt,
    founding_owner_bonus_expires_at: expiresAt,
    founding_owner_granted_at: grantedAt,
    founding_owner_promotion_id: activePromotion.id,
  };
}

export function applyFoundingOwnerBonusToPayout(
  payout: OwnerPayoutResult,
  foundingOwnerBonusCents: number,
): OwnerPayoutResult {
  const safeBonus = Number.isFinite(foundingOwnerBonusCents) && foundingOwnerBonusCents > 0
    ? foundingOwnerBonusCents
    : 0;

  if (safeBonus === 0) {
    return payout;
  }

  return {
    ...payout,
    owner_bonus_per_point_cents: safeBonus,
    owner_rate_per_point_cents: payout.owner_rate_per_point_cents + safeBonus,
    owner_total_cents:
      payout.owner_total_cents + payout.total_points_for_payout * safeBonus,
  };
}

export async function maybeGrantFoundingOwnerBonus(params: {
  adminClient: SupabaseClient;
  ownerId: string;
  now?: Date;
}) {
  const { adminClient, ownerId } = params;
  const now = params.now ?? new Date();

  console.error('[admin-owner-write-attempt]', {
    route: 'maybeGrantFoundingOwnerBonus',
    table: 'owners',
    operation: 'select',
    targetId: String(ownerId),
    client: 'service_role_admin_client',
  });
  const { data: owner, error: ownerError } = await adminClient
    .from("owners")
    .select(
      "id, founding_owner_bonus_cents_per_point, founding_owner_bonus_started_at, founding_owner_bonus_expires_at, founding_owner_granted_at, founding_owner_promotion_id",
    )
    .eq("id", ownerId)
    .maybeSingle();

  if (ownerError) {
    console.error('[admin-owner-write]', {
      route: 'maybeGrantFoundingOwnerBonus',
      table: 'owners',
      operation: 'select',
      targetId: String(ownerId),
      error: {
        message: ownerError.message ?? null,
        code: ownerError.code ?? null,
        details: ownerError.details ?? null,
        hint: ownerError.hint ?? null,
      },
    });
    return { granted: false, reason: "owner_load_failed" as const, error: ownerError };
  }

  if (!owner) {
    return { granted: false, reason: "owner_missing" as const, error: null };
  }

  console.error('[admin-owner-write-attempt]', {
    route: 'maybeGrantFoundingOwnerBonus',
    table: 'pricing_promotions',
    operation: 'select',
    targetId: String(ownerId),
    client: 'service_role_admin_client',
  });
  const { data: activePromotion, error: promotionError } = await getActivePromotion({ adminClient });
  if (promotionError) {
    console.error('[admin-owner-write]', {
      route: 'maybeGrantFoundingOwnerBonus',
      table: 'pricing_promotions',
      operation: 'select',
      targetId: String(ownerId),
      error: {
        message: promotionError.message ?? null,
        code: promotionError.code ?? null,
        details: promotionError.details ?? null,
        hint: promotionError.hint ?? null,
      },
    });
    return { granted: false, reason: "promotion_lookup_failed" as const, error: promotionError };
  }

  const update = buildFoundingOwnerGrantUpdate({
    owner: owner as FoundingOwnerRecord,
    activePromotion,
    now,
  });

  if (!update) {
    return {
      granted: false,
      reason: hasFoundingOwnerGrant(owner as FoundingOwnerRecord) ? "already_granted" as const : "inactive_promotion" as const,
      error: null,
    };
  }

  console.error('[admin-owner-write-attempt]', {
    route: 'maybeGrantFoundingOwnerBonus',
    table: 'owners',
    operation: 'update',
    targetId: String(ownerId),
    client: 'service_role_admin_client',
  });
  const { data: updatedOwner, error: updateError } = await adminClient
    .from("owners")
    .update(update)
    .eq("id", ownerId)
    .is("founding_owner_granted_at", null)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error('[admin-owner-write]', {
      route: 'maybeGrantFoundingOwnerBonus',
      table: 'owners',
      operation: 'update',
      targetId: String(ownerId),
      error: {
        message: updateError.message ?? null,
        code: updateError.code ?? null,
        details: updateError.details ?? null,
        hint: updateError.hint ?? null,
      },
    });
    return { granted: false, reason: "owner_update_failed" as const, error: updateError };
  }

  return {
    granted: Boolean(updatedOwner?.id),
    reason: updatedOwner?.id ? "granted" as const : "already_granted" as const,
    error: null,
  };
}

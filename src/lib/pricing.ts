type GuestPriceInput = {
  totalPoints: number | null;
  guestTotalCents: number | null;
};

type OwnerPayoutInput = {
  totalPoints: number | null;
  matchedMembershipResortId: string | null;
  bookingResortId: string | null;
};

type OwnerPayoutResult = {
  owner_base_rate_per_point_cents: number;
  owner_premium_per_point_cents: number;
  owner_rate_per_point_cents: number;
  owner_total_cents: number;
  owner_home_resort_premium_applied: boolean;
};

export const OWNER_PAYOUT_CONFIG = {
  default_base_rate_per_point_cents: 1600,
  default_home_resort_premium_per_point_cents: 200,
  resort_overrides: {} as Record<
    string,
    { base_rate_per_point_cents: number; premium_per_point_cents: number }
  >,
};

export function computeGuestPrice(input: GuestPriceInput) {
  const totalPoints = Number(input.totalPoints ?? 0);
  const guestTotalCents = Number(input.guestTotalCents ?? 0);
  if (!Number.isFinite(totalPoints) || totalPoints <= 0 || !Number.isFinite(guestTotalCents)) {
    return { guest_rate_per_point_cents: null, guest_total_cents: guestTotalCents || null };
  }
  const rate = Math.round(guestTotalCents / totalPoints);
  return { guest_rate_per_point_cents: rate, guest_total_cents: guestTotalCents };
}

export function computeOwnerPayout(input: OwnerPayoutInput): OwnerPayoutResult {
  const totalPoints = Number(input.totalPoints ?? 0);
  const overrides = input.bookingResortId
    ? OWNER_PAYOUT_CONFIG.resort_overrides[input.bookingResortId]
    : null;
  const baseRate = overrides?.base_rate_per_point_cents ?? OWNER_PAYOUT_CONFIG.default_base_rate_per_point_cents;
  const premiumRate =
    overrides?.premium_per_point_cents ?? OWNER_PAYOUT_CONFIG.default_home_resort_premium_per_point_cents;

  const premiumApplies =
    Boolean(input.matchedMembershipResortId && input.bookingResortId) &&
    input.matchedMembershipResortId === input.bookingResortId;
  const premiumPerPoint = premiumApplies ? premiumRate : 0;
  const ownerRate = baseRate + premiumPerPoint;
  const ownerTotal = Number.isFinite(totalPoints) && totalPoints > 0 ? totalPoints * ownerRate : 0;

  return {
    owner_base_rate_per_point_cents: baseRate,
    owner_premium_per_point_cents: premiumPerPoint,
    owner_rate_per_point_cents: ownerRate,
    owner_total_cents: ownerTotal,
    owner_home_resort_premium_applied: premiumApplies,
  };
}

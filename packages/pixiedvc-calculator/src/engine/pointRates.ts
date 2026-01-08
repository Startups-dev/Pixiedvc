export type PointRateTier = "PREMIUM" | "REGULAR" | "ADVANTAGE";

// Update these rates whenever David publishes new tier pricing.
export const POINT_RATE_BY_TIER: Record<PointRateTier, number> = {
  PREMIUM: 25.0,
  REGULAR: 23.0,
  ADVANTAGE: 20.0,
};

export function getPointRate(tier: PointRateTier) {
  return POINT_RATE_BY_TIER[tier];
}

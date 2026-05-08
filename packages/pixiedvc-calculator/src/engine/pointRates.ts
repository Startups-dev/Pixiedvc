export type PointRateTier = "PREMIER_ACCESS" | "PRIORITY_ACCESS" | "SELECT_ACCESS" | "VALUE_ACCESS";

// Update these rates whenever David publishes new tier pricing.
export const POINT_RATE_BY_TIER: Record<PointRateTier, number> = {
  PREMIER_ACCESS: 29.0,
  PRIORITY_ACCESS: 26.0,
  SELECT_ACCESS: 24.0,
  VALUE_ACCESS: 22.0,
};

export function getPointRate(tier: PointRateTier) {
  return POINT_RATE_BY_TIER[tier];
}

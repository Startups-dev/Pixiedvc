// src/engine/rates.ts
export const RATE_BY_CATEGORY = {
  PREMIUM: 25.0,
  REGULAR: 23.0,
  ADVANTAGE: 20.0,
} as const;

export const TIER_DISPLAY_NAMES = {
  PREMIUM: "Wish Tier",
  REGULAR: "Dream Tier",
  ADVANTAGE: "Pixie Tier",
} as const;

export const SERVICE_FEE_PCT = 0; // No additional fee - markup already included in per-point price

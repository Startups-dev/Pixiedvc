// src/engine/rates.ts
import { POINT_RATE_BY_TIER } from "./pointRates";

export const RATE_BY_CATEGORY = POINT_RATE_BY_TIER;

export const TIER_DISPLAY_NAMES = {
  PREMIUM: "Premium",
  REGULAR: "Regular",
  ADVANTAGE: "Advantage",
} as const;

export const SERVICE_FEE_PCT = 0; // No additional fee - markup already included in per-point price

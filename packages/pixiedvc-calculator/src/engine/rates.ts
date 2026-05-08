// src/engine/rates.ts
import { POINT_RATE_BY_TIER } from "./pointRates";

export const RATE_BY_CATEGORY = POINT_RATE_BY_TIER;

export const TIER_DISPLAY_NAMES = {
  PREMIER_ACCESS: "Premier Access",
  PRIORITY_ACCESS: "Priority Access",
  SELECT_ACCESS: "Select Access",
  VALUE_ACCESS: "Value Access",
} as const;

export const SERVICE_FEE_PCT = 0; // No additional fee - markup already included in per-point price

import type { PricingPromotion } from "@/lib/pricing-promotions";

function envFlag(name: string, defaultValue: boolean) {
  const raw = process.env[name];
  if (raw == null) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export const FOUNDING_OWNER_LAUNCH_FLAGS = {
  enabled: envFlag("FOUNDING_OWNER_LAUNCH_ENABLED", true),
} as const;

export function isFoundingOwnerLaunchPromotion(promotion: PricingPromotion | null | undefined) {
  const normalizedName = promotion?.name?.trim().toLowerCase() ?? "";
  return normalizedName === "founders launch" || normalizedName === "founding owner launch";
}

export function shouldShowFoundingOwnerLaunch(promotion: PricingPromotion | null | undefined) {
  if (!FOUNDING_OWNER_LAUNCH_FLAGS.enabled) return false;
  return isFoundingOwnerLaunchPromotion(promotion);
}

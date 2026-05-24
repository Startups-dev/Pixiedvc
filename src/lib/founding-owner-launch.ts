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

export function foundingOwnerLaunchDiagnosticsEnabled() {
  return process.env.NODE_ENV !== "production" || envFlag("DEBUG_FOUNDING_OWNER_LAUNCH", false);
}

export function normalizePromotionName(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isFoundingOwnerLaunchPromotion(promotion: PricingPromotion | null | undefined) {
  const normalizedName = normalizePromotionName(promotion?.name);
  return normalizedName === "founders launch" || normalizedName === "founding owner launch";
}

export function shouldShowFoundingOwnerLaunch(promotion: PricingPromotion | null | undefined) {
  if (!FOUNDING_OWNER_LAUNCH_FLAGS.enabled) return false;
  return isFoundingOwnerLaunchPromotion(promotion);
}

export function getFoundingOwnerLaunchDiagnostics(promotion: PricingPromotion | null | undefined) {
  const normalizedPromotionName = normalizePromotionName(promotion?.name);
  const nameMatcherPasses = isFoundingOwnerLaunchPromotion(promotion);
  const result = FOUNDING_OWNER_LAUNCH_FLAGS.enabled && nameMatcherPasses;

  return {
    hasActivePromotion: Boolean(promotion),
    activePromotionId: promotion?.id ?? null,
    activePromotionName: promotion?.name ?? null,
    activePromotionStartsAt: promotion?.starts_at ?? null,
    activePromotionEndsAt: promotion?.ends_at ?? null,
    foundingOwnerLaunchEnabledEnv: process.env.FOUNDING_OWNER_LAUNCH_ENABLED ?? null,
    normalizedPromotionName,
    nameMatcherPasses,
    shouldShowFoundingOwnerLaunch: result,
  };
}

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

const ENROLLMENT_TIME_ZONE = "America/Toronto";

function dateParts(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ENROLLMENT_TIME_ZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";

  return {
    date,
    month: part("month"),
    day: part("day"),
    year: part("year"),
  };
}

function localTime(date: Date) {
  const hasSubMinutePrecision = date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ENROLLMENT_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    ...(hasSubMinutePrecision ? { second: "2-digit" as const } : {}),
    ...(date.getUTCMilliseconds() !== 0 ? { fractionalSecondDigits: 3 as const } : {}),
    hour12: true,
    timeZoneName: "short",
  }).format(date);
}

export function getFoundingOwnerEnrollmentCopy(
  promotion: Pick<PricingPromotion, "starts_at" | "ends_at">,
) {
  const start = dateParts(promotion.starts_at);
  const end = dateParts(promotion.ends_at);
  const fullDate = (value: NonNullable<typeof start>) => `${value.month} ${value.day}, ${value.year}`;
  const shortDate = (value: NonNullable<typeof start>) => `${value.month.slice(0, 3).toUpperCase()} ${value.day}`;

  if (start && end) {
    const sameYear = start.year === end.year;
    const sameMonth = sameYear && start.month === end.month;
    const sameDay = sameMonth && start.day === end.day;
    const badge = sameDay
      ? `${shortDate(start)}, ${start.year}`
      : sameMonth
        ? `${shortDate(start)}–${end.day}, ${end.year}`
        : sameYear
          ? `${shortDate(start)}–${shortDate(end)}, ${end.year}`
          : `${shortDate(start)}, ${start.year}–${shortDate(end)}, ${end.year}`;
    const dateRange = sameDay
      ? `on ${fullDate(start)}`
      : sameMonth
        ? `between ${start.month} ${start.day} and ${end.day}, ${end.year}`
        : sameYear
          ? `between ${start.month} ${start.day} and ${fullDate(end)}`
          : `between ${fullDate(start)} and ${fullDate(end)}`;

    return {
      badge,
      eligibility: `Available to qualifying owners who join ${dateRange}.`,
      timing: `Enrollment opens ${fullDate(start)} at ${localTime(start.date)} and closes ${fullDate(end)} at ${localTime(end.date)} (Eastern Time).`,
    };
  }

  if (start) {
    return {
      badge: `FROM ${shortDate(start)}, ${start.year}`,
      eligibility: `Available to qualifying owners who join from ${fullDate(start)}.`,
      timing: `Enrollment opens ${fullDate(start)} at ${localTime(start.date)} (Eastern Time).`,
    };
  }

  if (end) {
    return {
      badge: `THROUGH ${shortDate(end)}, ${end.year}`,
      eligibility: `Available to qualifying owners who join by ${fullDate(end)} at ${localTime(end.date)} (Eastern Time).`,
      timing: null,
    };
  }

  return {
    badge: "ENROLLMENT OPEN",
    eligibility: "Available to qualifying owners who join while this promotion is active.",
    timing: null,
  };
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

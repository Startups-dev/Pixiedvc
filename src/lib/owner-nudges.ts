import { daysUntil, getBankingDeadline, getUseYearEndFromStart } from "@/lib/dvc-dates";

export type MembershipNudge = {
  stage: "banking" | "expiration";
  tier: {
    label: string;
    classes: string;
  };
  daysToExpire: number;
  daysToBank: number | null;
  expiration: string;
  bankingDeadline: string | null;
  label: string;
};

export function getMembershipExpirationDate(membership: {
  use_year_start?: string | null;
  use_year_end?: string | null;
  points_expiration_date?: string | null;
  banked_assumed_at?: string | null;
  expired_assumed_at?: string | null;
}) {
  if (membership.banked_assumed_at || membership.expired_assumed_at) return null;
  if (membership.use_year_end) return membership.use_year_end;
  if (membership.use_year_start) return getUseYearEndFromStart(membership.use_year_start);
  return membership.points_expiration_date ?? null;
}

function getBankingTier(daysLeft: number) {
  if (daysLeft <= 7) return { label: "Last week", classes: "bg-orange-50 text-orange-700" };
  return { label: "Bank soon", classes: "bg-yellow-50 text-yellow-700" };
}

function getExpirationTier(daysLeft: number) {
  if (daysLeft <= 30) return { label: "Critical", classes: "bg-rose-50 text-rose-700" };
  if (daysLeft <= 60) return { label: "Urgent", classes: "bg-red-50 text-red-700" };
  if (daysLeft <= 90) return { label: "Action", classes: "bg-amber-50 text-amber-700" };
  return { label: "Heads up", classes: "bg-yellow-50 text-yellow-700" };
}

export function getMembershipNudge(membership: {
  use_year_start?: string | null;
  use_year_end?: string | null;
  points_expiration_date?: string | null;
  banked_assumed_at?: string | null;
  expired_assumed_at?: string | null;
}) {
  const expiration = getMembershipExpirationDate(membership);
  if (!expiration) return null;
  const daysToExpire = daysUntil(expiration);
  if (Number.isNaN(daysToExpire) || daysToExpire <= 0) return null;

  const bankingDeadline = membership.use_year_start ? getBankingDeadline(membership.use_year_start) : null;
  const daysToBank = bankingDeadline ? daysUntil(bankingDeadline) : null;

  if (daysToBank !== null && daysToBank > 0) {
    if (daysToBank > 30) return null;
    const tier = getBankingTier(daysToBank);
    return {
      stage: "banking",
      tier,
      daysToExpire,
      daysToBank,
      expiration,
      bankingDeadline,
      label: daysToBank <= 7 ? "Banking closes in 7 days" : "Banking closes in 30 days",
    } satisfies MembershipNudge;
  }

  if (daysToExpire > 120) return null;
  const tier = getExpirationTier(daysToExpire);
  return {
    stage: "expiration",
    tier,
    daysToExpire,
    daysToBank: daysToBank ?? null,
    expiration,
    bankingDeadline,
    label: `Expires in ${daysToExpire} days`,
  } satisfies MembershipNudge;
}

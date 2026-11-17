export type ReadyStayPayoutBreakdown = {
  points: number;
  ownerBaseRatePerPointCents: number;
  ownerBaseTotalCents: number;
  foundingBonusPerPointCents: number | null;
  foundingBonusTotalCents: number | null;
  ownerTotalRatePerPointCents: number | null;
  ownerTotalCents: number | null;
  guestPricePerPointCents: number;
  guestTotalCents: number;
  hannaMarginAfterBonusCents: number | null;
};

export function calculateReadyStayPayoutBreakdown(params: {
  points: number;
  ownerBaseRatePerPointCents: number;
  foundingBonusPerPointCents: number | null;
  guestPricePerPointCents: number;
  lockedOwnerTotalRatePerPointCents?: number | null;
  lockedOwnerTotalCents?: number | null;
}) : ReadyStayPayoutBreakdown {
  const {
    points,
    ownerBaseRatePerPointCents,
    foundingBonusPerPointCents,
    guestPricePerPointCents,
    lockedOwnerTotalRatePerPointCents,
    lockedOwnerTotalCents,
  } = params;
  const ownerTotalRatePerPointCents = lockedOwnerTotalRatePerPointCents ?? (
    foundingBonusPerPointCents == null ? null : ownerBaseRatePerPointCents + foundingBonusPerPointCents
  );
  const foundingBonusTotalCents = foundingBonusPerPointCents == null
    ? null
    : points * foundingBonusPerPointCents;
  const ownerBaseTotalCents = points * ownerBaseRatePerPointCents;
  const ownerTotalCents = lockedOwnerTotalCents ?? (
    ownerTotalRatePerPointCents == null ? null : points * ownerTotalRatePerPointCents
  );
  const guestTotalCents = points * guestPricePerPointCents;

  return {
    points,
    ownerBaseRatePerPointCents,
    ownerBaseTotalCents,
    foundingBonusPerPointCents,
    foundingBonusTotalCents,
    ownerTotalRatePerPointCents,
    ownerTotalCents,
    guestPricePerPointCents,
    guestTotalCents,
    hannaMarginAfterBonusCents: ownerTotalCents == null ? null : guestTotalCents - ownerTotalCents,
  };
}

export function getLockedReadyStayFoundingBonusPerPointCents(params: {
  ownerBaseRatePerPointCents: number;
  ownerFoundingBonusPerPointCents?: number | null;
  ownerTotalRatePerPointCents?: number | null;
}) {
  const { ownerBaseRatePerPointCents, ownerFoundingBonusPerPointCents, ownerTotalRatePerPointCents } = params;
  if (ownerFoundingBonusPerPointCents != null) return ownerFoundingBonusPerPointCents;
  if (ownerTotalRatePerPointCents == null) return null;
  return Math.max(0, ownerTotalRatePerPointCents - ownerBaseRatePerPointCents);
}

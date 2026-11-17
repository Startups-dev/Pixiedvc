import { describe, expect, it } from "vitest";

import { calculateReadyStayPayoutBreakdown } from "./payout-calculation";

describe("Ready Stay payout breakdown", () => {
  it("applies the eligible Founders bonus once and funds it from Hanna's spread", () => {
    expect(calculateReadyStayPayoutBreakdown({
      points: 26,
      ownerBaseRatePerPointCents: 2300,
      foundingBonusPerPointCents: 200,
      guestPricePerPointCents: 3000,
    })).toEqual({
      points: 26,
      ownerBaseRatePerPointCents: 2300,
      ownerBaseTotalCents: 59800,
      foundingBonusPerPointCents: 200,
      foundingBonusTotalCents: 5200,
      ownerTotalRatePerPointCents: 2500,
      ownerTotalCents: 65000,
      guestPricePerPointCents: 3000,
      guestTotalCents: 78000,
      hannaMarginAfterBonusCents: 13000,
    });
  });

  it("pays a non-Founder the base amount and does not apply a bonus", () => {
    expect(calculateReadyStayPayoutBreakdown({
      points: 26,
      ownerBaseRatePerPointCents: 2300,
      foundingBonusPerPointCents: 0,
      guestPricePerPointCents: 3000,
    })).toMatchObject({
      ownerBaseTotalCents: 59800,
      foundingBonusTotalCents: 0,
      ownerTotalRatePerPointCents: 2300,
      ownerTotalCents: 59800,
      guestTotalCents: 78000,
      hannaMarginAfterBonusCents: 18200,
    });
  });

  it("shows a stored payout without inventing an unrecorded legacy bonus", () => {
    expect(calculateReadyStayPayoutBreakdown({
      points: 26,
      ownerBaseRatePerPointCents: 2300,
      foundingBonusPerPointCents: null,
      guestPricePerPointCents: 3000,
      lockedOwnerTotalCents: 65000,
    })).toMatchObject({
      foundingBonusPerPointCents: null,
      foundingBonusTotalCents: null,
      ownerTotalRatePerPointCents: null,
      ownerTotalCents: 65000,
      hannaMarginAfterBonusCents: 13000,
    });
  });
});

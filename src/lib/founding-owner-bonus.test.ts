import { describe, expect, it } from "vitest";

import {
  FOUNDING_OWNER_BONUS_CENTS_PER_POINT,
  buildFoundingOwnerGrantUpdate,
  getActiveFoundingOwnerBonusCents,
  hasFoundingOwnerGrant,
  isActiveFoundingOwner,
} from "@/lib/founding-owner-bonus";

describe("founding owner bonus", () => {
  it("builds a founding owner grant during an active founders launch promotion", () => {
    const now = new Date("2026-06-10T15:00:00.000Z");
    const update = buildFoundingOwnerGrantUpdate({
      owner: { founding_owner_bonus_cents_per_point: 0, founding_owner_granted_at: null },
      activePromotion: {
        id: "promo-1",
        name: "Founders Launch",
      } as never,
      now,
    });

    expect(update).toMatchObject({
      founding_owner_bonus_cents_per_point: FOUNDING_OWNER_BONUS_CENTS_PER_POINT,
      founding_owner_promotion_id: "promo-1",
      founding_owner_granted_at: "2026-06-10T15:00:00.000Z",
      founding_owner_bonus_started_at: "2026-06-10T15:00:00.000Z",
    });
    expect(update?.founding_owner_bonus_expires_at).toBe("2028-06-10T15:00:00.000Z");
  });

  it("does not grant outside founders launch or when already granted", () => {
    expect(
      buildFoundingOwnerGrantUpdate({
        owner: { founding_owner_bonus_cents_per_point: 0, founding_owner_granted_at: null },
        activePromotion: {
          id: "promo-2",
          name: "Guest Rewards",
        } as never,
        now: new Date("2026-06-10T15:00:00.000Z"),
      }),
    ).toBeNull();

    expect(
      buildFoundingOwnerGrantUpdate({
        owner: { founding_owner_bonus_cents_per_point: 200, founding_owner_granted_at: "2026-06-10T15:00:00.000Z" },
        activePromotion: {
          id: "promo-1",
          name: "Founders Launch",
        } as never,
        now: new Date("2026-06-10T15:00:00.000Z"),
      }),
    ).toBeNull();
  });

  it("returns the active founding owner bonus only before expiry", () => {
    const owner = {
      founding_owner_bonus_cents_per_point: 200,
      founding_owner_bonus_started_at: "2026-06-10T15:00:00.000Z",
      founding_owner_bonus_expires_at: "2028-06-10T15:00:00.000Z",
      founding_owner_granted_at: "2026-06-10T15:00:00.000Z",
    };

    expect(getActiveFoundingOwnerBonusCents(owner, new Date("2027-01-01T00:00:00.000Z"))).toBe(200);
    expect(getActiveFoundingOwnerBonusCents(owner, new Date("2028-06-10T15:00:00.000Z"))).toBe(0);
    expect(getActiveFoundingOwnerBonusCents(owner, new Date("2026-06-01T00:00:00.000Z"))).toBe(0);
  });

  it("treats any prior founding owner grant markers as already granted", () => {
    expect(hasFoundingOwnerGrant({ founding_owner_bonus_cents_per_point: 200 })).toBe(true);
    expect(hasFoundingOwnerGrant({ founding_owner_promotion_id: "promo-1" })).toBe(true);
    expect(hasFoundingOwnerGrant({ founding_owner_granted_at: null })).toBe(false);
  });

  it("treats null expiry as active for UI status and expired dates as inactive", () => {
    expect(
      isActiveFoundingOwner({
        founding_owner_bonus_cents_per_point: 200,
        founding_owner_bonus_expires_at: null,
      }),
    ).toBe(true);

    expect(
      isActiveFoundingOwner(
        {
          founding_owner_bonus_cents_per_point: 200,
          founding_owner_bonus_expires_at: "2026-06-10T15:00:00.000Z",
        },
        new Date("2026-06-11T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});

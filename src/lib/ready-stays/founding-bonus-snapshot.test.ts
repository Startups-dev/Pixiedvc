import { describe, expect, it } from "vitest";

import { resolveReadyStayFoundingBonusSnapshot } from "./founding-bonus-snapshot";

const draft = {
  verificationStatus: "not_submitted",
  verificationSubmittedAt: null,
  foundingBonusPerPointCents: null,
};

describe("Ready Stay Founders bonus submission snapshot", () => {
  it("uses eligibility at submission when a saved draft predates the grant", () => {
    const draftCreatedAt = new Date("2026-11-15T15:00:00.000Z");
    const draftSnapshot = resolveReadyStayFoundingBonusSnapshot({
      previous: null,
      next: draft,
      owner: null,
      now: draftCreatedAt,
    });
    expect(draftSnapshot).toEqual({
      foundingBonusPerPointCents: null,
      verificationSubmittedAt: null,
    });

    const submittedAt = new Date("2026-11-16T15:00:00.000Z");
    const result = resolveReadyStayFoundingBonusSnapshot({
      previous: {
        ...draft,
        foundingBonusPerPointCents: draftSnapshot.foundingBonusPerPointCents,
      },
      next: {
        verificationStatus: "proof_uploaded",
        verificationSubmittedAt: submittedAt.toISOString(),
        foundingBonusPerPointCents: null,
      },
      owner: {
        founding_owner_bonus_cents_per_point: 200,
        founding_owner_bonus_started_at: "2026-11-16T14:00:00.000Z",
        founding_owner_bonus_expires_at: "2028-11-16T14:00:00.000Z",
      },
      now: submittedAt,
    });

    expect(result).toEqual({
      foundingBonusPerPointCents: 200,
      verificationSubmittedAt: submittedAt.toISOString(),
    });
  });

  it("keeps the original bonus through repeated updates after submission", () => {
    const submitted = {
      verificationStatus: "proof_uploaded",
      verificationSubmittedAt: "2026-11-16T15:00:00.000Z",
      foundingBonusPerPointCents: 200,
    };
    const result = resolveReadyStayFoundingBonusSnapshot({
      previous: submitted,
      next: {
        verificationStatus: "approved",
        verificationSubmittedAt: null,
        foundingBonusPerPointCents: 0,
      },
      owner: null,
      now: new Date("2029-01-01T00:00:00.000Z"),
    });

    expect(result).toEqual({
      foundingBonusPerPointCents: 200,
      verificationSubmittedAt: submitted.verificationSubmittedAt,
    });
  });

  it("does not accept a client timestamp or bonus without a submission status", () => {
    expect(resolveReadyStayFoundingBonusSnapshot({
      previous: null,
      next: {
        verificationStatus: "not_submitted",
        verificationSubmittedAt: "2020-01-01T00:00:00.000Z",
        foundingBonusPerPointCents: 9999,
      },
      owner: {
        founding_owner_bonus_cents_per_point: 200,
        founding_owner_bonus_started_at: "2020-01-01T00:00:00.000Z",
        founding_owner_bonus_expires_at: "2030-01-01T00:00:00.000Z",
      },
      now: new Date("2026-11-16T15:00:00.000Z"),
    })).toEqual({
      foundingBonusPerPointCents: null,
      verificationSubmittedAt: null,
    });
  });

  it("preserves a NULL snapshot on legacy submitted records", () => {
    const submitted = {
      verificationStatus: "proof_uploaded",
      verificationSubmittedAt: "2026-11-16T15:00:00.000Z",
      foundingBonusPerPointCents: null,
    };
    expect(resolveReadyStayFoundingBonusSnapshot({
      previous: submitted,
      next: { ...submitted, verificationStatus: "approved" },
      owner: null,
      now: new Date("2029-01-01T00:00:00.000Z"),
    })).toEqual({
      foundingBonusPerPointCents: null,
      verificationSubmittedAt: submitted.verificationSubmittedAt,
    });
  });
});

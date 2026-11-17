import {
  getActiveFoundingOwnerBonusCents,
  type FoundingOwnerBonusFields,
} from "@/lib/founding-owner-bonus";

const SUBMITTED_VERIFICATION_STATUSES = new Set(["proof_uploaded", "submitted", "approved"]);
const HISTORIC_SUBMITTED_STATUSES = new Set([...SUBMITTED_VERIFICATION_STATUSES, "rejected"]);

export type ReadyStaySubmissionState = {
  verificationStatus: string | null;
  verificationSubmittedAt: string | null;
  foundingBonusPerPointCents: number | null;
};

function isSubmissionTransition(state: ReadyStaySubmissionState) {
  return Boolean(state.verificationStatus && SUBMITTED_VERIFICATION_STATUSES.has(state.verificationStatus));
}

function wasAlreadySubmitted(state: ReadyStaySubmissionState) {
  return Boolean(
    state.verificationSubmittedAt ||
      state.foundingBonusPerPointCents !== null ||
      (state.verificationStatus && HISTORIC_SUBMITTED_STATUSES.has(state.verificationStatus)),
  );
}

/**
 * Resolve the immutable bonus snapshot at first submission. A row may have
 * status="draft" while review is pending; verification state marks submission.
 * Existing submitted rows with NULL snapshots remain NULL for legacy fallback.
 */
export function resolveReadyStayFoundingBonusSnapshot(params: {
  previous: ReadyStaySubmissionState | null;
  next: ReadyStaySubmissionState;
  owner: FoundingOwnerBonusFields | null | undefined;
  now: Date;
}) {
  const { previous, next, owner, now } = params;

  if (previous && wasAlreadySubmitted(previous)) {
    return {
      foundingBonusPerPointCents: previous.foundingBonusPerPointCents,
      verificationSubmittedAt: previous.verificationSubmittedAt,
    };
  }

  if (!isSubmissionTransition(next)) {
    return {
      foundingBonusPerPointCents: null,
      verificationSubmittedAt: previous?.verificationSubmittedAt ?? null,
    };
  }

  return {
    foundingBonusPerPointCents: getActiveFoundingOwnerBonusCents(owner, now),
    verificationSubmittedAt: now.toISOString(),
  };
}

export const VERIFIED_PAYOUT_STATUSES = ["pending", "eligible", "released", "failed"] as const;
export const VERIFIED_RENTAL_STATUSES = [
  "matched",
  "awaiting_owner_approval",
  "approved",
  "booked",
  "stay_in_progress",
  "completed",
  "cancelled",
  "draft",
  "needs_dvc_booking",
  "booked_pending_agreement",
  "agreement_sent",
  "signed",
  "paid_70",
  "checked_out",
  "paid_balance",
] as const;
export const VERIFIED_MATCH_STATUSES = ["pending_owner", "accepted", "declined", "booked"] as const;
export const VERIFIED_READY_STAY_STATUSES = ["draft", "active", "paused", "sold", "expired", "removed", "test"] as const;
export const VERIFIED_READY_STAY_VERIFICATION_STATUSES = ["proof_uploaded", "submitted", "rejected"] as const;
export const VERIFIED_OWNER_VERIFICATION_STATUSES = ["not_started", "submitted", "approved", "rejected"] as const;
export const VERIFIED_OWNER_REWARD_STATUSES = ["enrolled", "not_enrolled", "enrollment_closed"] as const;
export const VERIFIED_MILESTONE_CODES = [
  "matched",
  "guest_verified",
  "payment_verified",
  "booking_package_sent",
  "agreement_sent",
  "owner_approved",
  "owner_booked",
  "disney_confirmation_uploaded",
  "payout_70_released",
  "check_in",
  "check_out",
  "payout_30_released",
  "testimonial_requested",
  "archived",
] as const;

const payoutStatusLabels: Record<string, string> = {
  pending: "Pending",
  eligible: "Ready for payout",
  released: "Paid",
  failed: "Payment issue",
};

const rentalStatusLabels: Record<string, string> = {
  matched: "Matched",
  awaiting_owner_approval: "Awaiting owner response",
  approved: "Approved",
  booked: "Reservation confirmed",
  stay_in_progress: "Stay in progress",
  completed: "Completed",
  cancelled: "Cancelled",
  draft: "Draft",
  needs_dvc_booking: "Booking needed",
  booked_pending_agreement: "Confirmation received",
  agreement_sent: "Agreement sent",
  signed: "Agreement signed",
  paid_70: "First payout released",
  checked_out: "Stay completed",
  paid_balance: "Final payout released",
};

const matchStatusLabels: Record<string, string> = {
  pending_owner: "Awaiting your response",
  accepted: "Accepted",
  declined: "Declined",
  booked: "Reservation created",
};

const milestoneLabels: Record<string, string> = {
  matched: "Matched",
  guest_verified: "Guest info complete",
  payment_verified: "Deposit confirmed",
  booking_package_sent: "Booking details ready",
  agreement_sent: "Agreement sent",
  owner_approved: "Owner approved",
  owner_booked: "Owner booked",
  disney_confirmation_uploaded: "Disney confirmation uploaded",
  payout_70_released: "First payout released",
  check_in: "Check-in",
  check_out: "Check-out",
  payout_30_released: "Final payout released",
  testimonial_requested: "Follow-up requested",
  archived: "Archived",
};

const readyStayStatusLabels: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Pending review",
  sold: "Booked",
  expired: "Inactive",
  removed: "Inactive",
  test: "Test listing",
};

const readyStayVerificationStatusLabels: Record<string, string> = {
  proof_uploaded: "Submitted for review",
  submitted: "Submitted for review",
  rejected: "Needs info",
};

const ownerVerificationStatusLabels: Record<string, string> = {
  not_started: "Not started",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Needs review",
};

const ownerRewardStatusLabels: Record<string, string> = {
  enrolled: "Enrolled",
  not_enrolled: "Not enrolled yet",
  enrollment_closed: "Enrollment closed",
};

export function getOwnerPayoutStatusLabel(status: string | null | undefined) {
  if (!status) return "Status unavailable";
  return payoutStatusLabels[status] ?? "Status unavailable";
}

export function getOwnerPayoutStageLabel(stage: number | null | undefined) {
  if (stage === 70) return "First payout";
  if (stage === 30) return "Final payout";
  return "Payout stage unavailable";
}

export function getOwnerRentalStatusLabel(status: string | null | undefined) {
  if (!status) return "Status unavailable";
  return rentalStatusLabels[status] ?? "Status unavailable";
}

export function getOwnerMatchStatusLabel(status: string | null | undefined) {
  if (!status) return "Status unavailable";
  return matchStatusLabels[status] ?? "Status unavailable";
}

export function getOwnerMilestoneLabel(code: string | null | undefined) {
  if (!code) return "Milestone unavailable";
  return milestoneLabels[code] ?? "Milestone unavailable";
}

export function getOwnerReadyStayStatusLabel(status: string | null | undefined, verificationStatus?: string | null) {
  if (verificationStatus && readyStayVerificationStatusLabels[verificationStatus]) {
    return readyStayVerificationStatusLabels[verificationStatus];
  }
  if (!status) return "Status unavailable";
  return readyStayStatusLabels[status] ?? "Status unavailable";
}

export function getOwnerVerificationStatusLabel(status: string | null | undefined) {
  if (!status) return "Status unavailable";
  return ownerVerificationStatusLabels[status] ?? "Status unavailable";
}

export function getOwnerRewardStatusLabel(status: string | null | undefined) {
  if (!status) return "Status unavailable";
  return ownerRewardStatusLabels[status] ?? "Status unavailable";
}

export function isReleasedOwnerPayoutStatus(status: string | null | undefined) {
  return status === "released";
}

export function isPendingOwnerPayoutStatus(status: string | null | undefined) {
  return status === "pending" || status === "eligible";
}

export function isExcludedOwnerPayoutStatus(status: string | null | undefined) {
  return status === "failed";
}

export function isInactiveOwnerRentalStatus(status: string | null | undefined) {
  return status === "cancelled" || status === "completed" || status === "paid_balance";
}

export function isActiveOwnerMatchStatus(status: string | null | undefined) {
  return status === "pending_owner" || status === "accepted" || status === "booked";
}

export function isExcludedOwnerMatchStatus(status: string | null | undefined) {
  return status === "declined" || status === "expired" || status === "rematched";
}

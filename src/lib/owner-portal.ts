export type RentalStatus =
  | "matched"
  | "awaiting_owner_approval"
  | "approved"
  | "booked"
  | "stay_in_progress"
  | "completed"
  | "cancelled";

export type MilestoneCode =
  | "matched"
  | "guest_verified"
  | "payment_verified"
  | "booking_package_sent"
  | "agreement_sent"
  | "owner_approved"
  | "owner_booked"
  | "disney_confirmation_uploaded"
  | "payout_70_released"
  | "check_in"
  | "check_out"
  | "payout_30_released"
  | "testimonial_requested"
  | "archived";

export type MilestoneStatus = "pending" | "completed" | "blocked";

export type MilestoneRow = {
  code: MilestoneCode;
  status: MilestoneStatus;
  occurred_at: string | null;
};

export type MilestoneStep = {
  code: MilestoneCode;
  label: string;
};

export const MILESTONE_SEQUENCE: MilestoneStep[] = [
  { code: "matched", label: "Matched" },
  { code: "guest_verified", label: "Guest info complete" },
  { code: "payment_verified", label: "Deposit confirmed" },
  { code: "owner_booked", label: "Booking completed" },
  { code: "disney_confirmation_uploaded", label: "Disney confirmation uploaded" },
  { code: "payout_70_released", label: "Deposit payout (70%)" },
  { code: "check_in", label: "Check-in" },
  { code: "payout_30_released", label: "Balance payout (30%)" },
  { code: "check_out", label: "Check-out" },
];

export const OWNER_ACTIONS = {
  approve: {
    label: "Approve booking package",
    description: "Confirm the booking package and agreement details.",
  },
  awaiting: {
    label: "Awaiting verification",
    description: "We're finalizing guest verification and payment details.",
  },
  uploadConfirmation: {
    label: "Upload Disney confirmation",
    description: "Upload the Disney confirmation email to trigger the 70% payout.",
  },
} as const;

export const APPROVAL_PREREQUISITES: MilestoneCode[] = [
  "guest_verified",
  "payment_verified",
];

export function normalizeMilestones(
  rows: { code: string; status: string; occurred_at: string | null }[] = [],
): MilestoneRow[] {
  return rows.map((row) => ({
    code: row.code as MilestoneCode,
    status: row.status as MilestoneStatus,
    occurred_at: row.occurred_at ?? null,
  }));
}

export function getMilestoneLabel(code: MilestoneCode) {
  return MILESTONE_SEQUENCE.find((step) => step.code === code)?.label ?? code;
}

export function getMilestoneStatus(code: MilestoneCode, milestones: MilestoneRow[]) {
  return milestones.find((milestone) => milestone.code === code)?.status ?? "pending";
}

export function getMissingApprovalPrerequisites(milestones: MilestoneRow[]) {
  return APPROVAL_PREREQUISITES.filter((code) => getMilestoneStatus(code, milestones) !== "completed");
}

export function buildMilestoneProgress(milestones: MilestoneRow[]) {
  const total = MILESTONE_SEQUENCE.length;
  const completed = MILESTONE_SEQUENCE.filter(
    (step) => milestones.find((milestone) => milestone.code === step.code)?.status === "completed",
  ).length;

  const percent = total ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
}

export function getNextOwnerAction(milestones: MilestoneRow[]) {
  const approvalStatus = getMilestoneStatus("owner_approved", milestones);
  if (approvalStatus !== "completed") {
    const missing = getMissingApprovalPrerequisites(milestones);
    if (missing.length > 0) {
      return OWNER_ACTIONS.awaiting;
    }
    return OWNER_ACTIONS.approve;
  }
  const confirmationStatus = getMilestoneStatus("disney_confirmation_uploaded", milestones);
  if (confirmationStatus !== "completed") {
    return OWNER_ACTIONS.uploadConfirmation;
  }
  return null;
}

export function getPayoutStageForMilestone(code: MilestoneCode) {
  if (code === "disney_confirmation_uploaded") return 70;
  if (code === "check_out") return 30;
  return null;
}

export function calculatePayoutAmountCents(rentalAmountCents: number | null, stage: 70 | 30) {
  const base = Number(rentalAmountCents ?? 0);
  if (!Number.isFinite(base) || base <= 0) return 0;
  const ratio = stage === 70 ? 0.7 : 0.3;
  return Math.round(base * ratio);
}

export function formatCurrency(amountCents: number | null) {
  const value = Number(amountCents ?? 0) / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

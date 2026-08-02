import type {
  NotificationRow,
  OwnerMatchRow,
  OwnerMembership,
  OwnerProfile,
  PayoutLedgerRow,
  RentalRow,
} from "@/lib/owner-data";
import type { MilestoneRow } from "@/lib/owner-portal";
import { normalizeMilestones } from "@/lib/owner-portal";
import { summarizeOwnerPayoutLedger } from "@/lib/owner/financial-summary";
import {
  getOwnerMatchStatusLabel,
  getOwnerPayoutStageLabel,
  getOwnerPayoutStatusLabel,
  getOwnerRentalStatusLabel,
  isActiveOwnerMatchStatus,
  isExcludedOwnerMatchStatus,
  isInactiveOwnerRentalStatus,
  isPendingOwnerPayoutStatus,
  isReleasedOwnerPayoutStatus,
} from "@/lib/owner/status-labels";

type PendingReadyStayTransferInput = {
  id: string;
  bookingId: string;
  resortName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  points: number | null;
};

export type OwnerDashboardRentalRow = RentalRow & {
  owner_id?: string | null;
  match_id?: string | null;
  booking_request_id?: string | null;
  dvc_confirmation_number?: string | null;
  disney_confirmation_number?: string | null;
};

export type OwnerMetricValue = {
  kind: "money" | "count";
  state: "available" | "zero" | "partial" | "unavailable";
  valueCents?: number;
  value?: number;
  displayValue: string;
  helper: string;
  warning?: string;
};

export type OwnerAttentionItem = {
  id: string;
  title: string;
  description: string;
  urgency: "low" | "medium" | "high";
  actionLabel: string;
  href: string;
  sourceType: "match" | "rental" | "notification" | "ready_stay";
};

export type OwnerPayoutSummary = {
  id: string;
  reservationLabel: string;
  amountCents: number;
  amountLabel: string;
  stageLabel: string;
  statusLabel: string;
  effectiveDateLabel: string;
  href: string;
};

export type OwnerReservationPipelineItem = {
  id: string;
  label: string;
  resortLabel: string;
  dateLabel: string;
  stageLabel: string;
  statusLabel: string;
  nextActionLabel: string | null;
  href: string;
};

export type OwnerActivityItem = {
  id: string;
  title: string;
  timestampLabel: string;
  href: string;
  read: boolean;
};

export type OwnerDashboardViewModel = {
  owner: {
    displayName: string;
    statusLabel: string;
    tierLabel?: string;
  };
  metrics: {
    totalEarned: OwnerMetricValue;
    pendingPayout: OwnerMetricValue;
    activeReservations: OwnerMetricValue;
    confirmedStays: OwnerMetricValue;
  };
  attentionItems: OwnerAttentionItem[];
  recentPayouts: OwnerPayoutSummary[];
  reservationPipeline: OwnerReservationPipelineItem[];
  recentActivity: OwnerActivityItem[];
  dataStatus: {
    generatedAt: string;
    partial: boolean;
    warnings: string[];
  };
};

export type BuildOwnerDashboardViewModelInput = {
  owner: OwnerProfile | null;
  memberships: OwnerMembership[];
  rentals: OwnerDashboardRentalRow[];
  payouts: PayoutLedgerRow[];
  notifications: NotificationRow[];
  matches: OwnerMatchRow[];
  pendingReadyStayTransfers?: PendingReadyStayTransferInput[];
  generatedAt?: string;
};

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountCents / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return "Dates unavailable";
  if (!start) return `Until ${formatDate(end)}`;
  if (!end) return `From ${formatDate(start)}`;
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function shortReference(id: string | null | undefined) {
  return id ? id.slice(0, 8).toUpperCase() : "UNKNOWN";
}

function metricFromMoney(cents: number, rowCount: number, partial: boolean, helper: string, warning?: string): OwnerMetricValue {
  return {
    kind: "money",
    state: partial ? "partial" : cents === 0 ? "zero" : "available",
    valueCents: cents,
    displayValue: formatCurrency(cents),
    helper: rowCount === 0 ? helper : `${rowCount} ledger row${rowCount === 1 ? "" : "s"}`,
    warning,
  };
}

function metricFromCount(value: number, helper: string, partial = false, warning?: string): OwnerMetricValue {
  return {
    kind: "count",
    state: partial ? "partial" : value === 0 ? "zero" : "available",
    value,
    displayValue: value.toLocaleString("en-US"),
    helper,
    warning,
  };
}

function hasCompletedMilestone(milestones: MilestoneRow[], code: string) {
  return milestones.some((milestone) => milestone.code === code && milestone.status === "completed");
}

function getRentalMilestones(rental: OwnerDashboardRentalRow) {
  return normalizeMilestones(rental.rental_milestones ?? []);
}

function isConfirmedStay(rental: OwnerDashboardRentalRow) {
  const milestones = getRentalMilestones(rental);
  if (hasCompletedMilestone(milestones, "disney_confirmation_uploaded")) return true;
  if (rental.dvc_confirmation_number || rental.disney_confirmation_number) return true;
  return ["booked", "stay_in_progress", "paid_70", "checked_out", "paid_balance", "completed"].includes(rental.status);
}

function getRentalStage(rental: OwnerDashboardRentalRow, payouts: PayoutLedgerRow[]) {
  const milestones = getRentalMilestones(rental);
  if (hasCompletedMilestone(milestones, "payout_30_released") || rental.status === "paid_balance") {
    return {
      stageLabel: "Final payout paid",
      nextActionLabel: null,
    };
  }
  if (hasCompletedMilestone(milestones, "check_out") || rental.status === "checked_out") {
    return {
      stageLabel: "Stay completed",
      nextActionLabel: "Await final payout",
    };
  }
  if (payouts.some((payout) => payout.rental_id === rental.id && payout.stage === 70 && isReleasedOwnerPayoutStatus(payout.status))) {
    return {
      stageLabel: "First payout released",
      nextActionLabel: null,
    };
  }
  if (isConfirmedStay(rental)) {
    const firstPayout = payouts.find((payout) => payout.rental_id === rental.id && payout.stage === 70);
    return {
      stageLabel: firstPayout && isPendingOwnerPayoutStatus(firstPayout.status)
        ? "First payout scheduled"
        : "Reservation confirmed",
      nextActionLabel: firstPayout && isPendingOwnerPayoutStatus(firstPayout.status) ? "Watch for payout release" : null,
    };
  }
  if (hasCompletedMilestone(milestones, "owner_approved") || rental.status === "approved") {
    return {
      stageLabel: "Owner confirmation needed",
      nextActionLabel: "Upload Disney confirmation",
    };
  }
  if (rental.status === "needs_dvc_booking" || rental.status === "accepted") {
    return {
      stageLabel: "Booking details ready",
      nextActionLabel: "Complete DVC booking",
    };
  }
  return {
    stageLabel: getOwnerRentalStatusLabel(rental.status),
    nextActionLabel: null,
  };
}

function buildAttentionItems(input: BuildOwnerDashboardViewModelInput): OwnerAttentionItem[] {
  const items: OwnerAttentionItem[] = [];
  const seen = new Set<string>();

  for (const match of input.matches) {
    if (match.status !== "pending_owner") continue;
    const id = `match:${match.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const resortName = match.booking?.primary_resort?.name ?? "a guest request";
    items.push({
      id,
      title: "Match awaiting your response",
      description: `Review ${resortName} before the response window expires.`,
      urgency: "high",
      actionLabel: "Review match",
      href: `/owner/matches/${match.id}`,
      sourceType: "match",
    });
  }

  for (const rental of input.rentals) {
    if (isInactiveOwnerRentalStatus(rental.status)) continue;
    const milestones = getRentalMilestones(rental);
    const approved = hasCompletedMilestone(milestones, "owner_approved") || rental.status === "approved";
    const confirmed = isConfirmedStay(rental);
    if (!approved || confirmed) continue;
    const id = `rental-confirmation:${rental.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      title: "Disney confirmation needed",
      description: `${rental.resort_code || "Reservation"} needs its Disney confirmation uploaded.`,
      urgency: "high",
      actionLabel: "Open reservation",
      href: `/owner/rentals/${rental.id}`,
      sourceType: "rental",
    });
  }

  for (const transfer of input.pendingReadyStayTransfers ?? []) {
    const id = `ready-stay:${transfer.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      title: "Ready Stay transfer needed",
      description: `${transfer.resortName ?? "A Ready Stay"} is waiting for owner transfer steps.`,
      urgency: "high",
      actionLabel: "Open Ready Stays",
      href: "/owner/ready-stays",
      sourceType: "ready_stay",
    });
  }

  for (const notification of input.notifications.filter((item) => !item.read_at).slice(0, 3)) {
    const id = `notification:${notification.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      title: notification.title,
      description: "You have an unread owner notification.",
      urgency: "medium",
      actionLabel: "Review notification",
      href: notification.link?.startsWith("/owner") ? notification.link : "/owner/notifications",
      sourceType: "notification",
    });
  }

  return items.slice(0, 5);
}

function buildRecentPayouts(payouts: PayoutLedgerRow[], rentals: OwnerDashboardRentalRow[]): OwnerPayoutSummary[] {
  const rentalsById = new Map(rentals.map((rental) => [rental.id, rental]));
  return payouts
    .slice()
    .sort((a, b) => {
      const aDate = a.released_at ?? a.eligible_at ?? a.created_at;
      const bDate = b.released_at ?? b.eligible_at ?? b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })
    .slice(0, 5)
    .map((payout) => {
      const rental = rentalsById.get(payout.rental_id);
      const resortLabel = rental?.resort_code ? `${rental.resort_code} ` : "";
      const effectiveDate = payout.released_at ?? payout.eligible_at ?? payout.created_at;
      return {
        id: payout.id,
        reservationLabel: `${resortLabel}Reservation ${shortReference(payout.rental_id)}`,
        amountCents: payout.amount_cents,
        amountLabel: formatCurrency(payout.amount_cents),
        stageLabel: getOwnerPayoutStageLabel(payout.stage),
        statusLabel: getOwnerPayoutStatusLabel(payout.status),
        effectiveDateLabel: formatDate(effectiveDate),
        href: "/owner/payouts",
      };
    });
}

function buildReservationPipeline(input: BuildOwnerDashboardViewModelInput): OwnerReservationPipelineItem[] {
  const rentalsByMatchId = new Map(
    input.rentals
      .filter((rental) => rental.match_id)
      .map((rental) => [rental.match_id as string, rental]),
  );
  const items: OwnerReservationPipelineItem[] = [];

  for (const match of input.matches) {
    if (!isActiveOwnerMatchStatus(match.status) || isExcludedOwnerMatchStatus(match.status)) continue;
    if (match.id && rentalsByMatchId.has(match.id)) continue;
    items.push({
      id: `match:${match.id}`,
      label: `Match ${shortReference(match.id)}`,
      resortLabel: match.booking?.primary_resort?.name ?? "Resort unavailable",
      dateLabel: formatDateRange(match.booking?.check_in, match.booking?.check_out),
      stageLabel: match.status === "pending_owner" ? "Awaiting owner response" : getOwnerMatchStatusLabel(match.status),
      statusLabel: getOwnerMatchStatusLabel(match.status),
      nextActionLabel: match.status === "pending_owner" ? "Review match" : null,
      href: `/owner/matches/${match.id}`,
    });
  }

  for (const rental of input.rentals) {
    if (isInactiveOwnerRentalStatus(rental.status)) continue;
    const stage = getRentalStage(rental, input.payouts);
    items.push({
      id: `rental:${rental.id}`,
      label: `Reservation ${shortReference(rental.id)}`,
      resortLabel: rental.resort_code || "Resort unavailable",
      dateLabel: formatDateRange(rental.check_in, rental.check_out),
      stageLabel: stage.stageLabel,
      statusLabel: getOwnerRentalStatusLabel(rental.status),
      nextActionLabel: stage.nextActionLabel,
      href: `/owner/rentals/${rental.id}`,
    });
  }

  return items
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, 5);
}

function buildRecentActivity(notifications: NotificationRow[]): OwnerActivityItem[] {
  return notifications.slice(0, 5).map((notification) => ({
    id: notification.id,
    title: notification.title,
    timestampLabel: formatDate(notification.created_at),
    href: notification.link?.startsWith("/owner") ? notification.link : "/owner/notifications",
    read: Boolean(notification.read_at),
  }));
}

function getOwnerStatusLabel(owner: OwnerProfile | null) {
  if (!owner?.verification) return "Owner status unavailable";
  if (owner.verification === "verified") return "Verified owner";
  if (owner.verification === "pending") return "Verification pending";
  if (owner.verification === "needs_more_info") return "Needs more information";
  if (owner.verification === "rejected") return "Verification unavailable";
  return "Owner status unavailable";
}

export function buildOwnerDashboardViewModel(input: BuildOwnerDashboardViewModelInput): OwnerDashboardViewModel {
  const financial = summarizeOwnerPayoutLedger(input.payouts);
  const activeRentals = input.rentals.filter((rental) => !isInactiveOwnerRentalStatus(rental.status));
  const rentalMatchIds = new Set(activeRentals.map((rental) => rental.match_id).filter(Boolean));
  const activeMatchesWithoutRental = input.matches.filter(
    (match) => isActiveOwnerMatchStatus(match.status) && !rentalMatchIds.has(match.id),
  );
  const confirmedStays = input.rentals.filter(isConfirmedStay);
  const warnings = [...financial.totalEarned.warnings, ...financial.pendingPayout.warnings];

  const displayName =
    input.owner?.profile_display_name?.trim() ||
    input.owner?.profile_full_name?.trim().split(/\s+/)[0] ||
    "Owner";

  return {
    owner: {
      displayName,
      statusLabel: getOwnerStatusLabel(input.owner),
    },
    metrics: {
      totalEarned: metricFromMoney(
        financial.totalEarned.cents,
        financial.totalEarned.rowCount,
        financial.totalEarned.partial,
        "No released payouts yet.",
        financial.totalEarned.warnings[0],
      ),
      pendingPayout: metricFromMoney(
        financial.pendingPayout.cents,
        financial.pendingPayout.rowCount,
        financial.pendingPayout.partial,
        "No payouts are currently pending.",
        financial.pendingPayout.warnings[0],
      ),
      activeReservations: metricFromCount(
        activeRentals.length + activeMatchesWithoutRental.length,
        "Currently in progress",
      ),
      confirmedStays: metricFromCount(
        confirmedStays.length,
        "Disney confirmation received",
      ),
    },
    attentionItems: buildAttentionItems(input),
    recentPayouts: buildRecentPayouts(input.payouts, input.rentals),
    reservationPipeline: buildReservationPipeline(input),
    recentActivity: buildRecentActivity(input.notifications),
    dataStatus: {
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      partial: warnings.length > 0,
      warnings,
    },
  };
}

export const ownerDashboardSourceOfTruth = {
  totalEarned: "payout_ledger rows with status released",
  pendingPayout: "payout_ledger rows with status pending or eligible",
  activeReservations: "active rentals plus active matches without a linked rental",
  confirmedStays: "rentals with Disney confirmation milestone, confirmation number, or confirmed workflow status",
  recentPayouts: "payout_ledger ordered by released_at, eligible_at, then created_at",
  recentActivity: "existing owner notifications only",
} as const;

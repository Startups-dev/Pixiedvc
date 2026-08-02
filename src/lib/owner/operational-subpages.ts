import type { OwnerMatchRow, PayoutLedgerRow, RentalRow } from "@/lib/owner-data";
import { buildMilestoneProgress, getNextOwnerAction, normalizeMilestones } from "@/lib/owner-portal";
import { summarizeOwnerPayoutLedger } from "@/lib/owner/financial-summary";
import {
  getOwnerMatchStatusLabel,
  getOwnerPayoutStageLabel,
  getOwnerPayoutStatusLabel,
  getOwnerRentalStatusLabel,
  isInactiveOwnerRentalStatus,
} from "@/lib/owner/status-labels";

export type OwnerPayoutFilter = "all" | "pending" | "eligible" | "released" | "failed";
export type OwnerRentalFilter = "active" | "completed" | "cancelled" | "all";
export type OwnerMatchFilter = "awaiting" | "accepted" | "declined" | "all";

export type OwnerFinancialSummaryCard = {
  label: string;
  valueLabel: string;
  helper: string;
  state: "zero" | "available" | "partial";
};

export type OwnerPayoutListItem = {
  id: string;
  reservationLabel: string;
  stageLabel: string;
  amountCents: number;
  amountLabel: string;
  status: string;
  statusLabel: string;
  eligibleDateLabel: string;
  releasedDateLabel: string;
  detailHref: string;
};

export type OwnerRentalListItem = {
  id: string;
  stayLabel: string;
  dateLabel: string;
  pointsLabel: string;
  status: string;
  statusLabel: string;
  group: Exclude<OwnerRentalFilter, "all">;
  nextActionLabel: string;
  progressLabel: string;
  progressPercent: number;
  detailHref: string;
};

export type OwnerMatchListItem = {
  id: string;
  matchLabel: string;
  dateLabel: string;
  pointsLabel: string;
  status: string;
  statusLabel: string;
  group: Exclude<OwnerMatchFilter, "all"> | "reservation_created";
  receivedDateLabel: string;
  expiresDateLabel: string;
  detailHref: string;
  actionLabel: string;
};

export function formatOwnerCurrency(amountCents: number | null | undefined) {
  const cents = typeof amountCents === "number" && Number.isFinite(amountCents) ? amountCents : 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatOwnerDate(value: string | null | undefined) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatOwnerDateRange(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return "Dates unavailable";
  if (!start) return `Until ${formatOwnerDate(end)}`;
  if (!end) return `From ${formatOwnerDate(start)}`;
  return `${formatOwnerDate(start)} - ${formatOwnerDate(end)}`;
}

function formatPoints(points: number | null | undefined) {
  if (typeof points !== "number" || !Number.isFinite(points)) return "Points unavailable";
  return `${points.toLocaleString("en-US")} pts`;
}

function shortReference(id: string | null | undefined) {
  return id ? id.slice(0, 8).toUpperCase() : "UNKNOWN";
}

export function buildOwnerPayoutSummaryCards(payouts: PayoutLedgerRow[]): OwnerFinancialSummaryCard[] {
  const summary = summarizeOwnerPayoutLedger(payouts);
  return [
    {
      label: "Total earned",
      valueLabel: formatOwnerCurrency(summary.totalEarned.cents),
      helper: summary.totalEarned.rowCount === 0 ? "No released payouts yet" : "Released payout ledger rows",
      state: summary.totalEarned.partial ? "partial" : summary.totalEarned.cents === 0 ? "zero" : "available",
    },
    {
      label: "Pending payout",
      valueLabel: formatOwnerCurrency(summary.pendingPayout.cents),
      helper: summary.pendingPayout.rowCount === 0 ? "No payouts currently pending" : "Pending or ready for payout",
      state: summary.pendingPayout.partial ? "partial" : summary.pendingPayout.cents === 0 ? "zero" : "available",
    },
  ];
}

export function buildOwnerPayoutListItems(payouts: PayoutLedgerRow[]): OwnerPayoutListItem[] {
  return payouts.map((payout) => ({
    id: payout.id,
    reservationLabel: `Reservation ${shortReference(payout.rental_id)}`,
    stageLabel: getOwnerPayoutStageLabel(payout.stage),
    amountCents: payout.amount_cents,
    amountLabel: formatOwnerCurrency(payout.amount_cents),
    status: payout.status,
    statusLabel: getOwnerPayoutStatusLabel(payout.status),
    eligibleDateLabel: formatOwnerDate(payout.eligible_at),
    releasedDateLabel: payout.released_at ? formatOwnerDate(payout.released_at) : "Not released",
    detailHref: `/owner/rentals/${payout.rental_id}`,
  }));
}

export function filterOwnerPayoutItems(items: OwnerPayoutListItem[], filter: OwnerPayoutFilter) {
  if (filter === "all") return items;
  return items.filter((item) => item.status === filter);
}

function rentalGroup(status: string): OwnerRentalListItem["group"] {
  if (status === "cancelled") return "cancelled";
  if (status === "completed" || status === "paid_balance") return "completed";
  if (isInactiveOwnerRentalStatus(status)) return "completed";
  return "active";
}

function rentalNextActionLabel(rental: RentalRow) {
  if (rental.status === "cancelled") return "View reservation";
  if (rental.status === "completed" || rental.status === "paid_balance") return "View reservation";
  if (rental.status === "needs_dvc_booking") return "Book reservation";

  const milestones = normalizeMilestones(rental.rental_milestones ?? []);
  const nextAction = getNextOwnerAction(milestones);
  if (!nextAction) return "No action needed";
  if (nextAction.label === "Approve booking package") return "Review booking package";
  return nextAction.label;
}

export function buildOwnerRentalListItems(rentals: RentalRow[]): OwnerRentalListItem[] {
  return rentals.map((rental) => {
    const milestones = normalizeMilestones(rental.rental_milestones ?? []);
    const progress = buildMilestoneProgress(milestones);
    return {
      id: rental.id,
      stayLabel: `${rental.resort_code || "Resort TBD"} reservation`,
      dateLabel: formatOwnerDateRange(rental.check_in, rental.check_out),
      pointsLabel: formatPoints(rental.points_required),
      status: rental.status,
      statusLabel: getOwnerRentalStatusLabel(rental.status),
      group: rentalGroup(rental.status),
      nextActionLabel: rentalNextActionLabel(rental),
      progressLabel: `${progress.completed} of ${progress.total} milestones complete`,
      progressPercent: progress.percent,
      detailHref: `/owner/rentals/${rental.id}`,
    };
  });
}

export function filterOwnerRentalItems(items: OwnerRentalListItem[], filter: OwnerRentalFilter) {
  if (filter === "all") return items;
  return items.filter((item) => item.group === filter);
}

export function getOwnerRentalFilterFromStatus(value: string | null | undefined): OwnerRentalFilter {
  if (value === "completed" || value === "paid_balance") return "completed";
  if (value === "cancelled") return "cancelled";
  if (value === "all") return "all";
  return "active";
}

function matchGroup(status: string): OwnerMatchListItem["group"] {
  if (status === "pending_owner") return "awaiting";
  if (status === "declined") return "declined";
  if (status === "booked") return "reservation_created";
  return "accepted";
}

export function buildOwnerMatchListItems(matches: OwnerMatchRow[], rentalByMatchId: Map<string, string> = new Map()): OwnerMatchListItem[] {
  return matches.map((match) => {
    const booking = match.booking;
    const rentalId = match.rental_id ?? rentalByMatchId.get(match.id) ?? null;
    const isReservationCreated = match.status === "booked" || Boolean(rentalId);
    const status = isReservationCreated && match.status === "accepted" ? "booked" : match.status;
    const detailHref = rentalId ? `/owner/rentals/${rentalId}` : `/owner/matches/${match.id}`;

    return {
      id: match.id,
      matchLabel: booking?.primary_resort?.name ?? "Resort TBD",
      dateLabel: formatOwnerDateRange(booking?.check_in, booking?.check_out),
      pointsLabel: formatPoints(booking?.total_points ?? match.points_reserved),
      status,
      statusLabel: getOwnerMatchStatusLabel(status),
      group: matchGroup(status),
      receivedDateLabel: formatOwnerDate(match.created_at),
      expiresDateLabel: match.expires_at ? formatOwnerDate(match.expires_at) : "No deadline listed",
      detailHref,
      actionLabel: rentalId ? "View reservation" : "Review match",
    };
  });
}

export function filterOwnerMatchItems(items: OwnerMatchListItem[], filter: OwnerMatchFilter) {
  if (filter === "all") return items;
  if (filter === "accepted") {
    return items.filter((item) => item.group === "accepted" || item.group === "reservation_created");
  }
  return items.filter((item) => item.group === filter);
}

import type { NotificationRow, OwnerMembership } from "@/lib/owner-data";
import {
  getOwnerReadyStayStatusLabel,
  getOwnerRewardStatusLabel,
  getOwnerVerificationStatusLabel,
} from "@/lib/owner/status-labels";

export type OwnerReadyStayFilter = "all" | "active" | "action_required" | "inactive" | "completed";

export type OwnerReadyStayListInput = {
  id: string;
  status: string | null;
  verification_status?: string | null;
  check_in: string | null;
  check_out: string | null;
  room_type: string | null;
  points: number | null;
  owner_price_per_point_cents: number | null;
  reservation_proof_uploaded_at?: string | null;
  updated_at?: string | null;
  resorts?: { name: string | null } | null;
};

export type OwnerReadyStayListItem = {
  id: string;
  resortLabel: string;
  roomLabel: string;
  dateLabel: string;
  pointsLabel: string;
  ownerRateLabel: string;
  estimatedOwnerPayoutLabel: string;
  statusLabel: string;
  proofLabel: string;
  updatedAtLabel: string;
  group: Exclude<OwnerReadyStayFilter, "all">;
  detailHref: string;
};

export type OwnerMembershipListItem = {
  id: string;
  resortLabel: string;
  useYearLabel: string;
  totalPointsLabel: string;
  availablePointsLabel: string;
  expiringPointsLabel: string;
  matchingModeLabel: string;
};

export type OwnerRewardSummary = {
  statusLabel: string;
  lifetimePointsLabel: string;
  tierLabel: string;
  bonusLabel: string;
};

export type OwnerNotificationListItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  createdAtLabel: string;
  read: boolean;
  canManageFallbackPrompt: boolean;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return "Dates unavailable";
  if (!start) return `Until ${formatDate(end)}`;
  if (!end) return `From ${formatDate(start)}`;
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function formatCurrencyFromCents(value: number | null | undefined, maximumFractionDigits = 0) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value / 100);
}

function formatPoints(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Points unavailable";
  return `${value.toLocaleString("en-US")} pts`;
}

function readyStayGroup(status: string | null, verificationStatus: string | null | undefined): OwnerReadyStayListItem["group"] {
  if (status === "sold") return "completed";
  if (status === "expired" || status === "removed") return "inactive";
  if (verificationStatus === "rejected" || verificationStatus === "proof_uploaded" || status === "draft" || status === "paused") {
    return "action_required";
  }
  return "active";
}

export function buildOwnerReadyStayListItems(rows: OwnerReadyStayListInput[]): OwnerReadyStayListItem[] {
  return rows.map((row) => {
    const points = Number(row.points ?? 0);
    const rate = Number(row.owner_price_per_point_cents ?? 0);
    return {
      id: row.id,
      resortLabel: row.resorts?.name ?? "Listing",
      roomLabel: row.room_type ?? "Room unavailable",
      dateLabel: formatDateRange(row.check_in, row.check_out),
      pointsLabel: formatPoints(row.points),
      ownerRateLabel: formatCurrencyFromCents(row.owner_price_per_point_cents),
      estimatedOwnerPayoutLabel: points > 0 && rate > 0 ? formatCurrencyFromCents(points * rate) : "Unavailable",
      statusLabel: getOwnerReadyStayStatusLabel(row.status, row.verification_status ?? null),
      proofLabel: row.reservation_proof_uploaded_at ? "Received" : "Missing",
      updatedAtLabel: formatDate(row.updated_at),
      group: readyStayGroup(row.status, row.verification_status),
      detailHref: `/owner/ready-stays/${row.id}`,
    };
  });
}

export function filterOwnerReadyStayItems(items: OwnerReadyStayListItem[], filter: OwnerReadyStayFilter) {
  if (filter === "all") return items;
  return items.filter((item) => item.group === filter);
}

export function buildOwnerMembershipListItems(memberships: OwnerMembership[]): OwnerMembershipListItem[] {
  return memberships.map((membership) => ({
    id: membership.id,
    resortLabel: membership.resort?.name ?? membership.home_resort ?? "Resort unavailable",
    useYearLabel: membership.use_year ?? "Use year unavailable",
    totalPointsLabel: formatPoints(membership.points_owned),
    availablePointsLabel: formatPoints(membership.points_available),
    expiringPointsLabel: membership.points_expiration_date ? formatDate(membership.points_expiration_date) : "No expiration date listed",
    matchingModeLabel:
      membership.matching_mode === "premium_then_standard" ? "Try Premium then Standard" : "Premium only",
  }));
}

export function buildOwnerRewardSummary(input: {
  enrolled: boolean;
  enrollmentEnabled: boolean;
  lifetimePoints: number;
  tier: string;
  bonusCents: number;
}): OwnerRewardSummary {
  const status = input.enrolled ? "enrolled" : input.enrollmentEnabled ? "not_enrolled" : "enrollment_closed";
  return {
    statusLabel: getOwnerRewardStatusLabel(status),
    lifetimePointsLabel: formatPoints(input.lifetimePoints),
    tierLabel: input.tier,
    bonusLabel: `+${formatCurrencyFromCents(input.bonusCents, 2)}/pt`,
  };
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /\b(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;

function redactNotificationText(value: string | null) {
  if (!value) return null;
  return value.replace(EMAIL_PATTERN, "[email removed]").replace(PHONE_PATTERN, "[phone removed]");
}

function safeOwnerHref(link: string | null) {
  if (!link) return null;
  if (link.startsWith("/owner/") || link === "/owner") return link;
  return null;
}

export function buildOwnerNotificationListItems(notifications: NotificationRow[]): OwnerNotificationListItem[] {
  return notifications.map((notification) => ({
    id: notification.id,
    title: redactNotificationText(notification.title) ?? "Notification",
    body: redactNotificationText(notification.body),
    href: safeOwnerHref(notification.link),
    createdAtLabel: formatDate(notification.created_at),
    read: Boolean(notification.read_at),
    canManageFallbackPrompt: notification.type === "premium_fallback_prompt",
  }));
}

export function getOwnerVerificationSummary(status: string | null | undefined) {
  return getOwnerVerificationStatusLabel(status);
}

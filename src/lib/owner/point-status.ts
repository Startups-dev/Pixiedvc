import { getBankingDeadline } from "@/lib/dvc-dates";
import { getMembershipExpirationDate } from "@/lib/owner-nudges";

export const POINT_STATUS_NOTIFICATION_TYPES = [
  "point_status_banking_deadline",
  "point_status_expiring_soon",
  "point_status_expired_confirmation_needed",
] as const;

export type PointStatusNotificationType = (typeof POINT_STATUS_NOTIFICATION_TYPES)[number];

export type PointStatusAction = "mark_banked" | "mark_expired" | "still_available" | "remind_later";

export type PointStatusMembership = {
  id: string;
  owner_id: string;
  use_year: string | null;
  use_year_start: string | null;
  use_year_end: string | null;
  points_available: number | null;
  points_reserved?: number | null;
  points_rented?: number | null;
  banked_assumed_at?: string | null;
  banked_points_amount?: number | null;
  expired_assumed_at?: string | null;
  points_expiration_date?: string | null;
  resort?: { name: string | null } | null;
  owner?: { user_id: string | null } | { user_id: string | null }[] | null;
};

export type PointStatusCondition = {
  type: PointStatusNotificationType;
  title: string;
  body: string;
  href: string;
  eligiblePoints: number;
  membershipId: string;
  date: string;
};

function getOwnerUserId(owner: PointStatusMembership["owner"]) {
  if (!owner) return null;
  if (Array.isArray(owner)) return owner[0]?.user_id ?? null;
  return owner.user_id ?? null;
}

function daysUntilFrom(dateISO: string, now: Date) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const target = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export function getEligibleMembershipPoints(membership: {
  points_available: number | null;
  points_reserved?: number | null;
  points_rented?: number | null;
  banked_points_amount?: number | null;
}) {
  const available = membership.points_available ?? 0;
  const reserved = membership.points_reserved ?? 0;
  const rented = membership.points_rented ?? 0;
  const banked = membership.banked_points_amount ?? 0;
  return Math.max(available - reserved - rented - banked, 0);
}

export function getPointStatusCondition(membership: PointStatusMembership, now = new Date()): PointStatusCondition | null {
  if (membership.banked_assumed_at || membership.expired_assumed_at) return null;

  const eligiblePoints = getEligibleMembershipPoints(membership);
  if (eligiblePoints <= 0) return null;

  const resortName = membership.resort?.name ?? "membership";
  const expiration = getMembershipExpirationDate(membership);
  if (!expiration) return null;

  const daysToExpire = daysUntilFrom(expiration, now);
  const commonParams = `membershipId=${encodeURIComponent(membership.id)}`;

  if (Number.isFinite(daysToExpire) && daysToExpire <= 0) {
    return {
      type: "point_status_expired_confirmation_needed",
      title: "Confirm the status of expired points",
      body: `These ${resortName} points may have expired based on the date in your membership. Please confirm what happened.`,
      href: `/owner/notifications?${commonParams}&pointStatus=expired_confirmation`,
      eligiblePoints,
      membershipId: membership.id,
      date: expiration,
    };
  }

  if (membership.use_year_start) {
    const bankingDeadline = getBankingDeadline(membership.use_year_start);
    const daysToBank = bankingDeadline ? daysUntilFrom(bankingDeadline, now) : null;
    if (daysToBank !== null && Number.isFinite(daysToBank) && daysToBank > 0 && daysToBank <= 60) {
      return {
        type: "point_status_banking_deadline",
        title: "Review your banking deadline",
        body: `Some of your ${resortName} points are approaching their banking deadline. Please confirm whether they are still available or have been banked.`,
        href: `/owner/notifications?${commonParams}&pointStatus=banking_deadline`,
        eligiblePoints,
        membershipId: membership.id,
        date: bankingDeadline,
      };
    }
  }

  if (Number.isFinite(daysToExpire) && daysToExpire <= 60) {
    return {
      type: "point_status_expiring_soon",
      title: "Points are expiring soon",
      body: `Some ${resortName} points may expire soon. Review the membership so HannaDVC can keep your availability accurate.`,
      href: `/owner/notifications?${commonParams}&pointStatus=expiring_soon`,
      eligiblePoints,
      membershipId: membership.id,
      date: expiration,
    };
  }

  return null;
}

export function parseRemindAfter(note: string | null | undefined) {
  const match = note?.match(/remind_after=([^;\s]+)/);
  if (!match) return null;
  const date = new Date(match[1]);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function shouldSuppressPointStatusNotification(events: Array<{ event_type: string | null; note: string | null; created_at: string | null }>, now = new Date()) {
  return events.some((event) => {
    if (event.event_type === "point_status_still_available") {
      if (!event.created_at) return false;
      const createdAt = new Date(event.created_at);
      if (Number.isNaN(createdAt.getTime())) return false;
      return now.getTime() - createdAt.getTime() < 14 * 24 * 60 * 60 * 1000;
    }

    if (event.event_type === "point_status_remind_later") {
      const remindAfter = parseRemindAfter(event.note);
      return remindAfter ? remindAfter > now : false;
    }

    return false;
  });
}

type PointStatusDbClient = {
  from: (table: string) => unknown;
};

function table(client: PointStatusDbClient, name: string) {
  return client.from(name) as {
    select: (columns: string) => {
      is?: (column: string, value: null) => unknown;
      eq?: (column: string, value: unknown) => unknown;
      in?: (column: string, values: unknown[]) => unknown;
    };
    insert: (payload: unknown) => PromiseLike<{ error?: { message?: string } | null }> | unknown;
    update?: (payload: unknown) => unknown;
  };
}

export async function generatePointStatusNotifications({
  client,
  now = new Date(),
}: {
  client: PointStatusDbClient;
  now?: Date;
}) {
  const membershipQuery = table(client, "owner_memberships")
    .select(
      "id, owner_id, use_year, use_year_start, use_year_end, points_available, points_reserved, points_rented, banked_assumed_at, banked_points_amount, expired_assumed_at, points_expiration_date, resort:resorts(name), owner:owners(user_id)",
    ) as {
      is: (column: string, value: null) => { is: (column: string, value: null) => PromiseLike<{ data: PointStatusMembership[] | null }> };
    };

  const { data: memberships } = await membershipQuery
    .is("banked_assumed_at", null)
    .is("expired_assumed_at", null);

  let created = 0;

  for (const membership of memberships ?? []) {
    const ownerUserId = getOwnerUserId(membership.owner);
    if (!ownerUserId) continue;

    const condition = getPointStatusCondition(membership, now);
    if (!condition) continue;

    const { data: recentEvents } = await ((table(client, "owner_points_events").select("event_type, note, created_at") as {
      eq: (column: string, value: unknown) => { eq: (column: string, value: unknown) => PromiseLike<{ data: Array<{ event_type: string | null; note: string | null; created_at: string | null }> | null }> };
    })
      .eq("owner_membership_id", membership.id)
      .eq("owner_id", membership.owner_id));

    if (shouldSuppressPointStatusNotification(recentEvents ?? [], now)) continue;

    const existingQuery = table(client, "notifications").select("id") as {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => {
          eq: (column: string, value: unknown) => {
            is: (column: string, value: null) => {
              limit: (count: number) => PromiseLike<{ data: Array<{ id: string }> | null }>;
            };
          };
        };
      };
    };
    const { data: existing } = await existingQuery
      .eq("user_id", ownerUserId)
      .eq("type", condition.type)
      .eq("link", condition.href)
      .is("read_at", null)
      .limit(1);

    if (existing && existing.length > 0) continue;

    await table(client, "notifications").insert({
      user_id: ownerUserId,
      type: condition.type,
      title: condition.title,
      body: condition.body,
      link: condition.href,
    });
    created += 1;
  }

  return { created };
}

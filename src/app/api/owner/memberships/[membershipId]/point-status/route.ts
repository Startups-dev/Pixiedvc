import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  getEligibleMembershipPoints,
  POINT_STATUS_NOTIFICATION_TYPES,
  type PointStatusAction,
} from "@/lib/owner/point-status";
import { isOwnerLifecycleActive, ownerLifecycleInactiveMessage } from "@/lib/owner/lifecycle";

const bodySchema = z.object({
  action: z.enum(["mark_banked", "mark_expired", "still_available", "remind_later"]),
  notificationId: z.string().trim().min(1).max(120),
  remindDays: z.number().int().min(1).max(30).optional(),
});

type MembershipRow = {
  id: string;
  owner_id: string;
  points_available: number | null;
  points_reserved: number | null;
  points_rented: number | null;
  banked_assumed_at: string | null;
  banked_points_amount: number | null;
  expired_assumed_at: string | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid action.", 400);
  }

  const { membershipId } = await params;
  const adminClient = getSupabaseAdminClient();
  const client = adminClient ?? supabase;

  const { data: owner } = await client
    .from("owners")
    .select("id, user_id, lifecycle_status")
    .or(`user_id.eq.${user.id},id.eq.${user.id}`)
    .maybeSingle();

  if (!owner) {
    return jsonError("Not found", 404);
  }

  if (!isOwnerLifecycleActive(owner) && parsed.data.action === "still_available") {
    return jsonError(ownerLifecycleInactiveMessage("available point confirmation"), 403);
  }

  const { data: membership } = await client
    .from("owner_memberships")
    .select("id, owner_id, points_available, points_reserved, points_rented, banked_assumed_at, banked_points_amount, expired_assumed_at")
    .eq("id", membershipId)
    .eq("owner_id", owner.id)
    .maybeSingle();

  if (!membership) {
    return jsonError("Not found", 404);
  }

  const { data: notification } = await client
    .from("notifications")
    .select("id, user_id, type, link, read_at")
    .eq("id", parsed.data.notificationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!notification || !POINT_STATUS_NOTIFICATION_TYPES.includes(notification.type)) {
    return jsonError("Notification not found.", 404);
  }

  if (typeof notification.link !== "string" || !notification.link.includes(`membershipId=${encodeURIComponent(membershipId)}`)) {
    return jsonError("Notification does not match this membership.", 403);
  }

  const nowIso = new Date().toISOString();
  const action: PointStatusAction = parsed.data.action;
  const eligiblePoints = getEligibleMembershipPoints(membership as MembershipRow);

  if (action === "mark_banked") {
    if (membership.banked_assumed_at || membership.expired_assumed_at) {
      return jsonError("This membership has already been resolved.", 409);
    }
    if (eligiblePoints <= 0) {
      return jsonError("No available points to mark as banked.", 409);
    }

    const { error: updateError } = await client
      .from("owner_memberships")
      .update({
        banked_assumed_at: nowIso,
        banked_assumed_reason: "Owner confirmed from notification",
        banked_points_amount: eligiblePoints,
        expired_assumed_at: null,
      })
      .eq("id", membershipId)
      .eq("owner_id", owner.id)
      .is("banked_assumed_at", null)
      .is("expired_assumed_at", null);

    if (updateError) {
      return jsonError("Unable to update membership.", 400);
    }
  } else if (action === "mark_expired") {
    if (membership.banked_assumed_at || membership.expired_assumed_at) {
      return jsonError("This membership has already been resolved.", 409);
    }
    if (eligiblePoints <= 0) {
      return jsonError("No available points to mark as expired.", 409);
    }

    const { error: updateError } = await client
      .from("owner_memberships")
      .update({
        expired_assumed_at: nowIso,
        banked_assumed_at: null,
        banked_assumed_reason: null,
        banked_points_amount: null,
      })
      .eq("id", membershipId)
      .eq("owner_id", owner.id)
      .is("banked_assumed_at", null)
      .is("expired_assumed_at", null);

    if (updateError) {
      return jsonError("Unable to update membership.", 400);
    }
  }

  const remindAfter =
    action === "remind_later"
      ? new Date(Date.now() + (parsed.data.remindDays ?? 7) * 24 * 60 * 60 * 1000).toISOString()
      : null;

  await client.from("owner_points_events").insert({
    owner_id: owner.id,
    owner_membership_id: membershipId,
    event_type:
      action === "mark_banked"
        ? "banked_points"
        : action === "mark_expired"
          ? "expired_points"
          : action === "still_available"
            ? "point_status_still_available"
            : "point_status_remind_later",
    points_amount: action === "mark_banked" || action === "mark_expired" ? eligiblePoints : null,
    note: remindAfter ? `source=owner_notification_action; remind_after=${remindAfter}` : "source=owner_notification_action",
  });

  await client
    .from("notifications")
    .update({ read_at: nowIso })
    .eq("id", notification.id)
    .eq("user_id", user.id);

  if (action === "mark_banked" || action === "mark_expired") {
    await client.from("notifications").insert({
      user_id: user.id,
      type: action === "mark_banked" ? "point_status_banked_confirmed" : "point_status_expired_confirmed",
      title: action === "mark_banked" ? "Points marked as banked" : "Points marked as expired",
      body:
        action === "mark_banked"
          ? "Thanks for confirming. HannaDVC recorded these points as banked for matching purposes."
          : "Thanks for confirming. HannaDVC recorded these points as expired for matching purposes.",
      link: "/owner/memberships",
    });
  }

  return NextResponse.json({ ok: true, action, pointsAmount: eligiblePoints });
}

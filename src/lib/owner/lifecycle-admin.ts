import type { SupabaseClient } from "@supabase/supabase-js";

import type { OwnerLifecycleStatus } from "@/lib/owner/lifecycle";

const INACTIVE_STATUSES = new Set<OwnerLifecycleStatus>(["suspended", "deactivated"]);
const UNSOLD_READY_STAY_STATUSES = ["draft", "active", "test", "paused"];

export async function updateOwnerLifecycleStatus(params: {
  client: SupabaseClient;
  ownerId: string;
  status: OwnerLifecycleStatus;
  actorId: string;
  reason?: string | null;
}) {
  const { client, ownerId, status, actorId, reason = null } = params;
  const now = new Date().toISOString();

  const { data: owner, error: ownerError } = await client
    .from("owners")
    .select("id, user_id, lifecycle_status")
    .eq("id", ownerId)
    .maybeSingle();

  if (ownerError) return { ok: false as const, error: ownerError.message };
  if (!owner) return { ok: false as const, error: "Owner not found." };

  const { error: updateError } = await client
    .from("owners")
    .update({
      lifecycle_status: status,
      lifecycle_status_changed_at: now,
      lifecycle_status_changed_by: actorId,
      lifecycle_status_reason: reason,
    })
    .eq("id", ownerId);

  if (updateError) return { ok: false as const, error: updateError.message };

  let readyStaysRemoved = 0;
  if (owner.user_id && INACTIVE_STATUSES.has(status)) {
    const { data: removedRows, error: readyStayError } = await client
      .from("ready_stays")
      .update({
        status: "removed",
        placement_home: false,
        placement_resort: false,
        placement_search: false,
      })
      .eq("owner_id", owner.user_id)
      .in("status", UNSOLD_READY_STAY_STATUSES)
      .is("sold_booking_request_id", null)
      .select("id");

    if (readyStayError) {
      return { ok: false as const, error: readyStayError.message };
    }
    readyStaysRemoved = removedRows?.length ?? 0;
  }

  await client.from("owner_comments").insert({
    owner_id: ownerId,
    author_id: actorId,
    kind: "status_change",
    body: `Lifecycle status changed to ${status}${reason ? `: ${reason}` : ""}`,
  });

  return {
    ok: true as const,
    ownerId,
    previousStatus: owner.lifecycle_status ?? "active",
    status,
    readyStaysRemoved,
  };
}

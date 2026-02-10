"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { applyPointsDelta, resolveResortMapping } from "@/lib/owner-membership-utils";

type MembershipInput = {
  resort_id: string;
  use_year: string;
  borrowing_enabled?: boolean;
  max_points_to_borrow?: number | null;
  buckets: Array<{
    use_year_start: string;
    use_year_end: string;
    points_available: number;
    points_holding: number;
  }>;
  purchase_channel?: string | null;
  acquired_at?: string | null;
};

async function getOwnerIdForUser(
  userId: string,
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const { data } = await client
    .from("owners")
    .select("id, user_id")
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();
  return data?.id ?? null;
}

export async function upsertOwnerMembership(input: MembershipInput) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const ownerId = await getOwnerIdForUser(user.id, supabase);
  if (!ownerId) {
    return { ok: false, error: "Owner record not found" };
  }

  if (!input.resort_id || !input.use_year || input.buckets.length === 0) {
    return { ok: false, error: "Missing required membership fields" };
  }

  if (input.purchase_channel === "resale" && !input.acquired_at) {
    return { ok: false, error: "Resale memberships require an acquisition date." };
  }

  const { data: resortRow } = await supabase
    .from("resorts")
    .select("id, calculator_code")
    .eq("id", input.resort_id)
    .maybeSingle();

  const homeResort = resortRow?.calculator_code ?? null;

  const payload = input.buckets.map((bucket) => ({
    owner_id: ownerId,
    resort_id: input.resort_id,
    home_resort: homeResort,
    use_year: input.use_year,
    use_year_start: bucket.use_year_start,
    use_year_end: bucket.use_year_end,
    points_owned: bucket.points_available + bucket.points_holding,
    points_available: bucket.points_available,
    purchase_channel: input.purchase_channel ?? "unknown",
    acquired_at: input.acquired_at ?? null,
    borrowing_enabled: input.borrowing_enabled ?? false,
    max_points_to_borrow: input.max_points_to_borrow ?? null,
  }));

  const { data, error } = await supabase
    .from("owner_memberships")
    .upsert(payload, { onConflict: "owner_id,resort_id,use_year,use_year_start" })
    .select("id");

  if (error) {
    return { ok: false, error: error.message };
  }

  const resaleRestricted =
    payload.purchase_channel === "resale" &&
    payload.acquired_at &&
    new Date(payload.acquired_at) >= new Date("2019-01-19");
  if (resaleRestricted) {
    const adminClient = getSupabaseAdminClient();
    if (adminClient) {
      const { data: existing } = await adminClient
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "resale_restriction_notice")
        .is("read_at", null)
        .limit(1);
      if (!existing || existing.length === 0) {
        await adminClient.from("notifications").insert({
          user_id: user.id,
          type: "resale_restriction_notice",
          title: "Resale booking restrictions",
          body: "Resale memberships acquired on/after Jan 19, 2019 have booking restrictions at certain resorts (including Riviera, Villas at Disneyland Hotel, and the Cabins at Fort Wilderness). PixieDVC will automatically avoid matching you to requests you can’t book.",
          link: "/owner/dashboard",
        });
      }
    }
  }

  revalidatePath("/owner/dashboard");
  return { ok: true, id: Array.isArray(data) ? data[0]?.id ?? null : null };
}

export async function adjustOwnerMembershipPoints(membershipId: string, delta: number) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const ownerId = await getOwnerIdForUser(user.id, supabase);
  if (!ownerId) {
    return { ok: false, error: "Owner record not found" };
  }

  const { data: membership } = await supabase
    .from("owner_memberships")
    .select("id, owner_id, points_owned, points_available")
    .eq("id", membershipId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "Membership not found" };
  }

  let updated;
  try {
    updated = applyPointsDelta({
      pointsOwned: membership.points_owned ?? 0,
      pointsAvailable: membership.points_available ?? 0,
      delta,
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid points adjustment" };
  }

  const { error } = await supabase
    .from("owner_memberships")
    .update({
      points_owned: updated.pointsOwned,
      points_available: updated.pointsAvailable,
    })
    .eq("id", membershipId)
    .eq("owner_id", ownerId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/owner/dashboard");
  return { ok: true };
}

export async function fixMembershipResortMapping(membershipId: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const ownerId = await getOwnerIdForUser(user.id, supabase);
  if (!ownerId) {
    return { ok: false, error: "Owner record not found" };
  }

  const { data: membership } = await supabase
    .from("owner_memberships")
    .select("id, owner_id, home_resort, resort_id")
    .eq("id", membershipId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "Membership not found" };
  }

  if (membership.resort_id) {
    return { ok: true };
  }

  const adminClient = getSupabaseAdminClient() ?? supabase;
  const { data: resorts } = await adminClient
    .from("resorts")
    .select("id, calculator_code");

  const resortId = resolveResortMapping(membership.home_resort ?? null, resorts ?? []);
  if (!resortId) {
    return { ok: false, error: "Unable to map resort code" };
  }

  const { error } = await supabase
    .from("owner_memberships")
    .update({ resort_id: resortId })
    .eq("id", membershipId)
    .eq("owner_id", ownerId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/owner/dashboard");
  return { ok: true };
}

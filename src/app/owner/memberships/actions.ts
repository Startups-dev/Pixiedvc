"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { applyPointsDelta, resolveResortMapping } from "@/lib/owner-membership-utils";

type MembershipInput = {
  membershipId?: string | null;
  resort_id: string;
  use_year: string;
  contract_year: number;
  points_owned: number;
  points_available: number;
  points_reserved?: number | null;
};

async function getOwnerIdForUser(userId: string, client: ReturnType<typeof createServer>) {
  const { data } = await client
    .from("owners")
    .select("id, user_id")
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();
  return data?.id ?? null;
}

export async function upsertOwnerMembership(input: MembershipInput) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient();
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

  if (!input.resort_id || !input.use_year || !Number.isFinite(input.contract_year)) {
    return { ok: false, error: "Missing required membership fields" };
  }

  const { data: resortRow } = await supabase
    .from("resorts")
    .select("id, calculator_code")
    .eq("id", input.resort_id)
    .maybeSingle();

  const homeResort = resortRow?.calculator_code ?? null;

  const payload = {
    owner_id: ownerId,
    resort_id: input.resort_id,
    home_resort: homeResort,
    use_year: input.use_year,
    contract_year: input.contract_year,
    points_owned: input.points_owned,
    points_available: input.points_available,
    points_reserved: input.points_reserved ?? 0,
  };

  const { data, error } = await supabase
    .from("owner_memberships")
    .upsert(payload, { onConflict: "owner_id,resort_id,use_year,contract_year" })
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/owner/dashboard");
  return { ok: true, id: data?.id ?? null };
}

export async function adjustOwnerMembershipPoints(membershipId: string, delta: number) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient();
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
  const supabase = createSupabaseServerClient();
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

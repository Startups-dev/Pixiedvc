import { redirect } from "next/navigation";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getHomeForRole } from "@/lib/routes/home";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isOwnerLifecycleActive, normalizeOwnerLifecycleStatus, type OwnerLifecycleStatus } from "@/lib/owner/lifecycle";

type OwnerRow = {
  id: string;
  user_id: string | null;
  lifecycle_status?: string | null;
  agreement_accepted_at?: string | null;
  agreement_version?: string | null;
  metadata?: Record<string, unknown> | null;
};

type OwnerDbClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export type OwnerAccessState = {
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
  } | null;
  owner: OwnerRow | null;
  role: string | null;
  onboardingComplete: boolean;
  lifecycleStatus: OwnerLifecycleStatus | null;
  agreementAcceptedAt: string | null;
  redirectTo: string | null;
};

function getMetadataAgreement(owner: OwnerRow | null) {
  const metadata = owner?.metadata ?? null;
  if (!metadata || typeof metadata !== "object") return null;
  const agreement = metadata.agreement;
  if (!agreement || typeof agreement !== "object") return null;
  return agreement as Record<string, unknown>;
}

function resolveAgreementAcceptedAt(owner: OwnerRow | null) {
  if (!owner) return null;
  if (owner.agreement_accepted_at) return owner.agreement_accepted_at;
  const metadataAgreement = getMetadataAgreement(owner);
  return typeof metadataAgreement?.accepted_at === "string" ? metadataAgreement.accepted_at : null;
}

function isOnboardingComplete(profile: { onboarding_completed?: boolean | null; onboarding_completed_at?: string | null } | null, userMetadata?: Record<string, unknown> | null) {
  return (
    userMetadata?.onboarding_completed === true ||
    profile?.onboarding_completed === true ||
    Boolean(profile?.onboarding_completed_at)
  );
}

async function resolveOwnerRecord({
  db,
  userId,
  createIfMissing,
}: {
  db: OwnerDbClient;
  userId: string;
  createIfMissing: boolean;
}) {
  const { data: ownerByUserId, error: byUserError } = await db
    .from("owners")
    .select("id, user_id, lifecycle_status, agreement_accepted_at, agreement_version, metadata")
    .eq("user_id", userId)
    .maybeSingle();
  let owner = ownerByUserId;

  if (byUserError) {
    throw byUserError;
  }

  if (!owner) {
    const { data: byIdOwner, error: byIdError } = await db
      .from("owners")
      .select("id, user_id, lifecycle_status, agreement_accepted_at, agreement_version, metadata")
      .eq("id", userId)
      .maybeSingle();
    if (byIdError) {
      throw byIdError;
    }
    owner = byIdOwner;
  }

  if (!owner && createIfMissing) {
    const { error: insertError } = await db
      .from("owners")
      .upsert({ id: userId, user_id: userId }, { onConflict: "id" });
    if (insertError) {
      throw insertError;
    }

    const { data: createdOwner, error: createdOwnerError } = await db
      .from("owners")
      .select("id, user_id, lifecycle_status, agreement_accepted_at, agreement_version, metadata")
      .eq("id", userId)
      .maybeSingle();
    if (createdOwnerError) {
      throw createdOwnerError;
    }
    owner = createdOwner;
  }

  if (owner && !owner.user_id && owner.id === userId) {
    const { error: repairError } = await db
      .from("owners")
      .update({ user_id: userId })
      .eq("id", userId)
      .is("user_id", null);
    if (repairError) {
      throw repairError;
    }
    owner.user_id = userId;
  }

  return owner as OwnerRow | null;
}

export async function getOwnerAccessState({
  redirectPath,
  createMissingOwner = true,
}: {
  redirectPath: string;
  createMissingOwner?: boolean;
}): Promise<OwnerAccessState> {
  const supabase = await createSupabaseServerClient();
  const adminClient = getSupabaseAdminClient();
  const db = adminClient ?? supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      owner: null,
      role: null,
      onboardingComplete: false,
      lifecycleStatus: null,
      agreementAcceptedAt: null,
      redirectTo: `/login?redirect=${encodeURIComponent(redirectPath)}`,
    };
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role, onboarding_completed, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const role =
    (typeof user.user_metadata?.role === "string" ? user.user_metadata.role : null) ??
    ((profile?.role as string | undefined) ?? null);
  const onboardingComplete = isOnboardingComplete(profile, user.user_metadata as Record<string, unknown> | null);

  if (role !== "owner") {
    return {
      user,
      owner: null,
      role,
      onboardingComplete,
      lifecycleStatus: null,
      agreementAcceptedAt: null,
      redirectTo: getHomeForRole(role),
    };
  }

  if (!onboardingComplete) {
    return {
      user,
      owner: null,
      role,
      onboardingComplete,
      lifecycleStatus: null,
      agreementAcceptedAt: null,
      redirectTo: "/owner/onboarding",
    };
  }

  const owner = await resolveOwnerRecord({
    db,
    userId: user.id,
    createIfMissing: createMissingOwner,
  });
  const agreementAcceptedAt = resolveAgreementAcceptedAt(owner);

  if (!owner) {
    return {
      user,
      owner: null,
      role,
      onboardingComplete,
      lifecycleStatus: null,
      agreementAcceptedAt: null,
      redirectTo: "/owner/onboarding",
    };
  }

  if (!agreementAcceptedAt) {
    const lifecycleStatus = normalizeOwnerLifecycleStatus(owner.lifecycle_status);
    return {
      user,
      owner,
      role,
      onboardingComplete,
      lifecycleStatus,
      agreementAcceptedAt: null,
      redirectTo: "/owner/onboarding/agreement",
    };
  }

  const lifecycleStatus = normalizeOwnerLifecycleStatus(owner.lifecycle_status);
  if (!isOwnerLifecycleActive(owner)) {
    return {
      user,
      owner,
      role,
      onboardingComplete,
      lifecycleStatus,
      agreementAcceptedAt,
      redirectTo: "/owner/account-status",
    };
  }

  return {
    user,
    owner,
    role,
    onboardingComplete,
    lifecycleStatus,
    agreementAcceptedAt,
    redirectTo: null,
  };
}

export async function requireOwnerAccess(redirectPath: string, _cookieStore?: RequestCookies) {
  void _cookieStore;
  const state = await getOwnerAccessState({ redirectPath });
  if (state.redirectTo) {
    redirect(state.redirectTo);
  }

  return {
    user: state.user!,
    owner: state.owner!,
    agreementAcceptedAt: state.agreementAcceptedAt,
  };
}

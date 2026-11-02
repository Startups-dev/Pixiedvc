import "server-only";

import { cache } from "react";
import { isUserAdmin } from "@/lib/admin";
import { isActiveAffiliateStatus } from "@/lib/affiliates";
import { isOwnerLifecycleActive } from "@/lib/owner/lifecycle";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getHomeForRole, type AccountNavigation, type DashboardDestination } from "@/lib/routes/home";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Read-only projection of existing portal policies, never an authorization guard. */
export async function resolveAccountNavigation(client?: ServerClient): Promise<AccountNavigation | null> {
  const supabase = client ?? await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase.from("profiles")
    .select("display_name, role, onboarding_completed, onboarding_completed_at")
    .eq("id", user.id).maybeSingle();
  if (error) throw error;

  const dashboards: DashboardDestination[] = [];
  const isAdmin = isUserAdmin({ profileRole: profile?.role, appRole: user.app_metadata?.role, email: user.email });
  if (isAdmin) dashboards.push({ id: "admin", label: "Admin", href: getHomeForRole("admin") });

  // Match owner/access.ts's current role precedence. Admin access alone is not owner access.
  const ownerRole = typeof user.user_metadata?.role === "string" ? user.user_metadata.role : profile?.role;
  const db = getSupabaseAdminClient() ?? supabase;
  if (ownerRole === "owner") {
    let href = "/owner/onboarding";
    const onboarded = user.user_metadata?.onboarding_completed === true ||
      profile?.onboarding_completed === true || Boolean(profile?.onboarding_completed_at);
    if (onboarded) {
      // If a legacy owner row is missing, leave its creation to the existing guard.
      href = getHomeForRole("owner");
      const byUser = await db.from("owners")
        .select("id, lifecycle_status, agreement_accepted_at, metadata").eq("user_id", user.id).maybeSingle();
      if (byUser.error) throw byUser.error;
      const byId = byUser.data ? byUser : await db.from("owners")
        .select("id, lifecycle_status, agreement_accepted_at, metadata").eq("id", user.id).maybeSingle();
      if (byId.error) throw byId.error;
      const owner = byId.data;
      if (owner) {
        const metadataAgreement = owner.metadata?.agreement?.accepted_at;
        const agreement = owner.agreement_accepted_at ||
          (typeof metadataAgreement === "string" ? metadataAgreement : null);
        href = !agreement ? "/owner/onboarding/agreement" :
          !isOwnerLifecycleActive(owner) ? "/owner/account-status" : getHomeForRole("owner");
      }
    }
    dashboards.push({ id: "owner", label: "Owner Portal", href });
  }

  // Match the active-affiliate policy without invoking application self-healing.
  const byUser = await db.from("affiliates").select("id, status").eq("auth_user_id", user.id).maybeSingle();
  if (byUser.error) throw byUser.error;
  const byEmail = byUser.data || !user.email ? byUser :
    await db.from("affiliates").select("id, status").eq("email", user.email).maybeSingle();
  if (byEmail.error) throw byEmail.error;
  if (profile?.role === "admin" || (byEmail.data?.id && isActiveAffiliateStatus(byEmail.data.status))) {
    dashboards.push({ id: "affiliate", label: "Affiliate Portal", href: getHomeForRole("affiliate") });
  }

  // Existing guest pages accept signed-in users and enforce ownership themselves.
  dashboards.push({ id: "guest", label: "My Trip", href: getHomeForRole("guest") });
  const knownGuest = profile?.role === "guest" || user.user_metadata?.role === "guest";
  return {
    label: profile?.display_name ?? user.email ?? "Signed in",
    dashboards,
    defaultHref: dashboards.find((item) => item.id !== "guest")?.href ??
      (profile?.role === "affiliate" ? getHomeForRole("affiliate") : knownGuest ? getHomeForRole("guest") : getHomeForRole(null)),
  };
}

// React's cache is request scoped; it never shares an account between requests.
export const getAccountNavigation = cache(resolveAccountNavigation);

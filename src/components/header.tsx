import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUserAdmin } from "@/lib/admin";
import HeaderClient from "@/components/header-client";

export default async function Header() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userLabel: string | null = null;
  let userRole: string | null = null;
  let showAdminLink = false;
  let hasAffiliateAccess = false;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .maybeSingle();
    userLabel = profile?.display_name ?? user.email ?? "Signed in";
    userRole = profile?.role ?? null;
    showAdminLink = isUserAdmin({
      profileRole: profile?.role ?? null,
      appRole: (user.app_metadata?.role as string | undefined) ?? null,
      email: user.email ?? null,
    });
    console.info("[header-admin-debug]", {
      email: user.email ?? null,
      profileRole: profile?.role ?? null,
      appRole: (user.app_metadata?.role as string | undefined) ?? null,
      userMetadataRole: (user.user_metadata?.role as string | undefined) ?? null,
      isAdmin: showAdminLink,
    });
    hasAffiliateAccess = profile?.role === "affiliate" || profile?.role === "admin";

    if (!hasAffiliateAccess) {
      const { data: affiliateByAuth } = await supabase
        .from("affiliates")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (affiliateByAuth?.id) {
        hasAffiliateAccess = true;
      } else if (user.email) {
        const { data: affiliateByEmail } = await supabase
          .from("affiliates")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();
        hasAffiliateAccess = Boolean(affiliateByEmail?.id);
      }
    }
  }

  return (
    <HeaderClient
      userLabel={userLabel}
      userRole={userRole}
      isAdmin={showAdminLink}
      isAuthenticated={Boolean(user)}
      hasAffiliateAccess={hasAffiliateAccess}
    />
  );
}

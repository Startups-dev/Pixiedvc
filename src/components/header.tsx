import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";
import HeaderClient from "@/components/header-client";

export default async function Header() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userLabel: string | null = null;
  let userRole: string | null = null;
  let showAdminLink = false;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .maybeSingle();
    userLabel = profile?.display_name ?? user.email ?? "Signed in";
    userRole = profile?.role ?? null;
    showAdminLink = isAdminEmail(user.email ?? null);
  }

  return (
    <HeaderClient
      userLabel={userLabel}
      userRole={userRole}
      isAdmin={showAdminLink}
      isAuthenticated={Boolean(user)}
    />
  );
}

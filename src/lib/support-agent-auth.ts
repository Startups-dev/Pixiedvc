import { isUserAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupportAgentRole = "admin" | "agent";

type SupportAgentEligibility = {
  user: {
    id: string;
    email: string | null;
    app_metadata?: Record<string, unknown>;
  };
  isAdmin: boolean;
  isSupportAgent: boolean;
  profileRole: string | null;
  appRole: string | null;
  supportAgentRole: SupportAgentRole | null;
};

export async function getSupportAgentEligibility(): Promise<SupportAgentEligibility | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: supportAgent }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("support_agents")
      .select("role, active")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const profileRole = profile?.role ?? null;
  const appRole = (user.app_metadata?.role as string | undefined) ?? null;
  const isAdmin = isUserAdmin({
    profileRole,
    appRole,
    email: user.email ?? null,
  });
  const supportAgentRole =
    supportAgent?.role === "admin" || supportAgent?.role === "agent"
      ? supportAgent.role
      : null;
  const isSupportAgent = Boolean(
    supportAgent?.active &&
      (supportAgentRole === "admin" || supportAgentRole === "agent"),
  );

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      app_metadata: user.app_metadata as Record<string, unknown>,
    },
    isAdmin,
    isSupportAgent,
    profileRole,
    appRole,
    supportAgentRole,
  };
}

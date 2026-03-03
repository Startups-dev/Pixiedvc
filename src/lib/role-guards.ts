import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type AppRole = "guest" | "owner" | "affiliate" | "admin" | "staff" | null;

async function getSessionWithRole(redirectTo: string, loginPath = "/login") {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${loginPath}?redirect=${encodeURIComponent(redirectTo)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role ?? "guest") as AppRole;

  return { supabase, user, role } as const;
}

export async function requireAffiliateUser(redirectTo: string) {
  const session = await getSessionWithRole(redirectTo, "/affiliate/login");
  if (session.role === "affiliate" || session.role === "admin") {
    return session;
  }

  const adminClient = getSupabaseAdminClient();
  if (adminClient) {
    const byUser = await adminClient
      .from("affiliates")
      .select("id, status")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();

    const byEmail =
      byUser.data ??
      (session.user.email
        ? (
            await adminClient
              .from("affiliates")
              .select("id, status")
              .eq("email", session.user.email)
              .maybeSingle()
          ).data
        : null);

    const status = String(byEmail?.status ?? "").toLowerCase();
    const isApprovedAffiliate =
      Boolean(byEmail?.id) && ["pending_review", "verified", "active", "approved"].includes(status);

    if (isApprovedAffiliate) {
      return session;
    }
  }

  redirect(`/affiliate/login?redirect=${encodeURIComponent(redirectTo)}&error=role`);
  return session;
}

export async function requireGuestUser(redirectTo: string) {
  const session = await getSessionWithRole(redirectTo, "/login");
  if (session.role !== "guest" && session.role !== "admin") {
    redirect("/");
  }
  return session;
}

export async function requireOwnerUser(redirectTo: string) {
  const session = await getSessionWithRole(redirectTo, "/login");
  if (session.role !== "owner" && session.role !== "admin") {
    redirect("/");
  }
  return session;
}

export async function requireAdminUser(redirectTo: string) {
  const session = await getSessionWithRole(redirectTo, "/login");
  if (session.role !== "admin") {
    redirect("/");
  }
  return session;
}

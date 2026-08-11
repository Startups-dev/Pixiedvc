import { getCurrentUserAdminState } from "@/lib/admin";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";

export type HaraAccessMode = "public" | "preview" | "disabled";

export type HaraAccessState = {
  enabled: boolean;
  mode: HaraAccessMode;
};

export function isPixiePublicEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (env.PIXIE_PUBLIC_ENABLED === "true") return true;
  if (env.PIXIE_PUBLIC_ENABLED === "false") return false;
  return env.NODE_ENV !== "production";
}

export async function getHaraAccessState(env: NodeJS.ProcessEnv = process.env): Promise<HaraAccessState> {
  const publicEnabled = isPixiePublicEnabled(env);
  if (publicEnabled) {
    const access = { enabled: true, mode: "public" } as const;
    console.info("[hara-access-debug]", {
      event: "hara_access_debug",
      authenticated: false,
      hasEmail: false,
      emailAllowedForAdmin: false,
      profileRole: null,
      appRole: null,
      adminStateIsAdmin: false,
      publicEnabled,
      resultingMode: access.mode,
    });
    return access;
  }

  const adminState = await getCurrentUserAdminState();
  const access = adminState.isAdmin
    ? ({ enabled: true, mode: "preview" } as const)
    : ({ enabled: false, mode: "disabled" } as const);
  const email = adminState.user?.email ?? null;

  console.info("[hara-access-debug]", {
    event: "hara_access_debug",
    authenticated: Boolean(adminState.user),
    hasEmail: Boolean(email),
    emailAllowedForAdmin: emailIsAllowedForAdmin(email),
    profileRole: adminState.profileRole,
    appRole: adminState.appRole,
    adminStateIsAdmin: adminState.isAdmin,
    publicEnabled,
    resultingMode: access.mode,
  });

  if (adminState.isAdmin) {
    return access;
  }

  return access;
}

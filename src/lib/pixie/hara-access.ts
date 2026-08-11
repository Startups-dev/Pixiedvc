import { getCurrentUserAdminState, isUserAdmin } from "@/lib/admin";

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

export function canUseHaraPreview(input: {
  profileRole?: string | null;
  appRole?: string | null;
  email?: string | null;
}) {
  return isUserAdmin(input);
}

export async function getHaraAccessState(env: NodeJS.ProcessEnv = process.env): Promise<HaraAccessState> {
  if (isPixiePublicEnabled(env)) {
    return { enabled: true, mode: "public" };
  }

  try {
    const adminState = await getCurrentUserAdminState();
    if (
      canUseHaraPreview({
        profileRole: adminState.profileRole,
        appRole: adminState.appRole,
        email: adminState.user?.email ?? null,
      })
    ) {
      return { enabled: true, mode: "preview" };
    }
  } catch {
    return { enabled: false, mode: "disabled" };
  }

  return { enabled: false, mode: "disabled" };
}

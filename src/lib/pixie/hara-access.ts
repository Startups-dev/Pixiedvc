import { getCurrentUserAdminState } from "@/lib/admin";

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
  if (isPixiePublicEnabled(env)) {
    return { enabled: true, mode: "public" };
  }

  const adminState = await getCurrentUserAdminState();
  if (adminState.isAdmin) {
    return { enabled: true, mode: "preview" };
  }

  return { enabled: false, mode: "disabled" };
}

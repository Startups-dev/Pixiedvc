export type AppRole = "guest" | "owner" | null | undefined;

export function getHomeForRole(role: AppRole): string {
  if (role === "owner") return "/owner/dashboard";
  if (role === "guest") return "/my-trip";
  return "/onboarding";
}

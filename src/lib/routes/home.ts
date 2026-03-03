export type AppRole = "guest" | "owner" | "affiliate" | "admin" | null | undefined;

export function getHomeForRole(role: AppRole): string {
  if (role === "affiliate") return "/affiliate/dashboard";
  if (role === "admin") return "/admin";
  if (role === "owner") return "/owner/dashboard";
  if (role === "guest") return "/my-trip";
  return "/onboarding";
}

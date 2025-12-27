import { redirect } from "next/navigation";

import type { UserRole } from "@pixiedvc/data";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
};

// Placeholder: integrate with Supabase auth when ready.
export async function getCurrentUser(): Promise<SessionUser | null> {
  return null;
}

export async function requireRole(allowed: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!allowed.includes(user.role)) {
    redirect("/");
  }
  return user;
}

export function canAccessOwnerPortal(role: UserRole) {
  return role === "owner_pending" || role === "owner_verified" || role === "admin";
}

export function canAccessGuestPortal(role: UserRole) {
  return role === "guest" || role === "admin";
}

export function canAccessPartnerPortal(role: UserRole) {
  return role === "partner" || role === "admin";
}

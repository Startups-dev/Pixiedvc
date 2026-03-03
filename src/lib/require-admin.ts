import { emailIsAllowedForAdmin } from "@/lib/admin-emails";

export function requireAdminEmail(email?: string | null): void {
  if (!emailIsAllowedForAdmin(email)) {
    const err = new Error("Unauthorized");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
}

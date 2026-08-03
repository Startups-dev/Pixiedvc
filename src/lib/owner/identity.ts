import "server-only";

import type { OwnerShellIdentity } from "@/lib/owner/identity-types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type { OwnerShellIdentity };

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getOwnerInitials(displayName: string | null, email: string | null) {
  const source = displayName ?? email ?? "Owner";
  const nameParts = source
    .replace(/@.*/, "")
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);

  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }

  return (nameParts[0]?.slice(0, 2) || "O").toUpperCase();
}

export function buildOwnerShellIdentity(input: {
  userEmail?: string | null;
  userMetadata?: Record<string, unknown> | null;
  profile?: {
    display_name?: string | null;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
}): OwnerShellIdentity {
  const displayName =
    cleanText(input.profile?.display_name) ??
    cleanText(input.profile?.full_name) ??
    cleanText(input.userMetadata?.full_name) ??
    cleanText(input.userMetadata?.name) ??
    cleanText(input.userEmail?.split("@")[0]);
  const email = cleanText(input.profile?.email) ?? cleanText(input.userEmail);
  const avatarUrl = cleanText(input.profile?.avatar_url) ?? cleanText(input.userMetadata?.avatar_url);

  return {
    displayName,
    email,
    avatarUrl,
    initials: getOwnerInitials(displayName, email),
  };
}

export async function loadOwnerShellIdentity(): Promise<OwnerShellIdentity> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildOwnerShellIdentity({});
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, full_name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return buildOwnerShellIdentity({
    userEmail: user.email,
    userMetadata: user.user_metadata as Record<string, unknown> | null,
    profile,
  });
}

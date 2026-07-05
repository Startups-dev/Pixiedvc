import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { getHomeForRole } from "@/lib/routes/home";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const safeOrigin = getAppBaseUrl() ?? origin;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tokenType = searchParams.get("type");
  const next = searchParams.get("next") ?? searchParams.get("redirect");
  const supabase = await createSupabaseServerClient();
  let callbackUser = null;

  if (code) {
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    callbackUser = data.user;
  } else if (tokenHash && tokenType) {
    const { data } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tokenType as
        | "signup"
        | "invite"
        | "magiclink"
        | "recovery"
        | "email_change"
        | "email",
    });
    callbackUser = data.user;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const resolvedUser = user ?? callbackUser;

  if (next) {
    const safeNext = next.startsWith("/") ? next : "/affiliate/dashboard";
    if (!resolvedUser && safeNext.startsWith("/affiliate")) {
      const affiliateLoginUrl = new URL("/affiliate/login", safeOrigin);
      affiliateLoginUrl.searchParams.set("redirect", safeNext);
      affiliateLoginUrl.searchParams.set("error", "session");
      return NextResponse.redirect(affiliateLoginUrl);
    }
    if (resolvedUser && safeNext.startsWith("/affiliate/login")) {
      const affiliateLoginUrl = new URL(safeNext, safeOrigin);
      affiliateLoginUrl.searchParams.set("confirmed", "1");
      return NextResponse.redirect(affiliateLoginUrl);
    }
    return NextResponse.redirect(new URL(safeNext, safeOrigin));
  }

  const metaRole = (resolvedUser?.user_metadata?.role as
    | "owner"
    | "guest"
    | "affiliate"
    | "admin"
    | "staff"
    | undefined) ?? null;
  let role: "owner" | "guest" | "affiliate" | "admin" | null =
    metaRole === "owner" || metaRole === "guest" || metaRole === "affiliate" || metaRole === "admin"
      ? metaRole
      : null;

  if (resolvedUser?.id && !role) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", resolvedUser.id).maybeSingle();
    const profileRole = (profile?.role as
      | "owner"
      | "guest"
      | "affiliate"
      | "admin"
      | "staff"
      | undefined) ?? null;
    role =
      profileRole === "owner" ||
      profileRole === "guest" ||
      profileRole === "affiliate" ||
      profileRole === "admin"
        ? profileRole
        : null;
  }

  return NextResponse.redirect(new URL(getHomeForRole(role), safeOrigin));
}

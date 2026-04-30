import { NextResponse } from "next/server";
import { getHomeForRole } from "@/lib/routes/home";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tokenType = searchParams.get("type");
  const next = searchParams.get("next") ?? searchParams.get("redirect");
  const supabase = await createSupabaseServerClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && tokenType) {
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tokenType as
        | "signup"
        | "invite"
        | "magiclink"
        | "recovery"
        | "email_change"
        | "email",
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (next) {
    const safeNext = next.startsWith("/") ? next : "/affiliate/dashboard";
    if (!user && safeNext.startsWith("/affiliate")) {
      return NextResponse.redirect(new URL(`/affiliate/login?redirect=${encodeURIComponent(safeNext)}&error=session`, origin));
    }
    return NextResponse.redirect(new URL(safeNext, origin));
  }

  const metaRole = (user?.user_metadata?.role as
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

  if (user?.id && !role) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
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

  return NextResponse.redirect(new URL(getHomeForRole(role), origin));
}

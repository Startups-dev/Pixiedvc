import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { getLoginDestination, getSafeReturnPath, isPathWithin } from "@/lib/routes/home";
import { resolveAccountNavigation } from "@/lib/navigation";
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

  const safeNext = getSafeReturnPath(next);
  if (safeNext) {
    const nextPathname = decodeURIComponent(new URL(safeNext, safeOrigin).pathname);
    if (!resolvedUser && isPathWithin(nextPathname, "/affiliate")) {
      const affiliateLoginUrl = new URL("/affiliate/login", safeOrigin);
      affiliateLoginUrl.searchParams.set("redirect", safeNext);
      affiliateLoginUrl.searchParams.set("error", "session");
      return NextResponse.redirect(affiliateLoginUrl);
    }
    if (resolvedUser && nextPathname === "/affiliate/login") {
      const affiliateLoginUrl = new URL(safeNext, safeOrigin);
      affiliateLoginUrl.searchParams.set("confirmed", "1");
      return NextResponse.redirect(affiliateLoginUrl);
    }
  }

  const navigation = await resolveAccountNavigation(supabase);
  return NextResponse.redirect(new URL(getLoginDestination(navigation, safeNext), safeOrigin));
}

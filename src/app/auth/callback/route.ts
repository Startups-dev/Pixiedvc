import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getHomeForRole } from "@/lib/routes/home";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (next) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const metaRole = (user?.user_metadata?.role as string | undefined) ?? null;
  let role = metaRole === "owner" || metaRole === "guest" ? metaRole : null;

  if (user?.id && !role) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const profileRole = (profile?.role as string | undefined) ?? null;
    role = profileRole === "owner" || profileRole === "guest" ? profileRole : null;
  }

  return NextResponse.redirect(new URL(getHomeForRole(role), origin));
}

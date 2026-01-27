import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { AFFILIATE_COOKIE, AFFILIATE_CLICK_COOKIE, AFFILIATE_COOKIE_MAX_AGE } from "@/lib/affiliate-cookies";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { ref?: string; path?: string } | null;
  const ref = body?.ref?.trim();
  if (!ref) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data, error } = await supabase.rpc("resolve_affiliate", { slug_or_code: ref });

  if (error || !data || data.length === 0) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const affiliateId = data[0].affiliate_id as string;
  const clickId = crypto.randomUUID();
  const userAgent = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");

  await supabase.from("affiliate_clicks").insert({
    affiliate_id: affiliateId,
    click_id: clickId,
    landing_path: body?.path ?? "/",
    referrer,
    user_agent: userAgent,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AFFILIATE_COOKIE, affiliateId, {
    path: "/",
    maxAge: AFFILIATE_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set(AFFILIATE_CLICK_COOKIE, clickId, {
    path: "/",
    maxAge: AFFILIATE_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

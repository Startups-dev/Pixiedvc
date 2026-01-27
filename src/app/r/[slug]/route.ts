import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { AFFILIATE_COOKIE, AFFILIATE_CLICK_COOKIE, AFFILIATE_COOKIE_MAX_AGE } from "@/lib/affiliate-cookies";

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  const supabase = createRouteHandlerClient({ cookies });

  const { data, error } = await supabase.rpc("resolve_affiliate", { slug_or_code: slug });

  if (error || !data || data.length === 0) {
    const fallback = new URL("/", request.url);
    return NextResponse.redirect(fallback);
  }

  const affiliateId = data[0].affiliate_id as string;
  const clickId = crypto.randomUUID();
  const url = new URL(request.url);
  const landingPath = url.searchParams.get("to") ?? "/";
  const referrer = request.headers.get("referer");
  const userAgent = request.headers.get("user-agent");

  await supabase.from("affiliate_clicks").insert({
    affiliate_id: affiliateId,
    click_id: clickId,
    landing_path: landingPath,
    referrer,
    user_agent: userAgent,
  });

  const destination = new URL(landingPath, request.url);
  const response = NextResponse.redirect(destination);

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

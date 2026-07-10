import { NextResponse } from "next/server";

import {
  AFFILIATE_CLICK_COOKIE,
  AFFILIATE_COOKIE,
  AFFILIATE_COOKIE_MAX_AGE,
  AFFILIATE_SESSION_COOKIE,
  AFFILIATE_VISITOR_COOKIE,
} from "@/lib/affiliate-cookies";
import { recordAffiliateClickAttribution } from "@/lib/affiliate-attribution";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    ref?: string;
    path?: string;
    click_id?: string;
    visitor_id?: string;
    visitor_session_id?: string;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmTerm?: string | null;
    utmContent?: string | null;
  } | null;
  const ref = body?.ref?.trim();
  const clickId = body?.click_id?.trim();
  if (!ref) {
    return NextResponse.json({ ok: true });
  }
  if (!clickId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await recordAffiliateClickAttribution({
    ref,
    clickId,
    visitorId: body?.visitor_id,
    visitorSessionId: body?.visitor_session_id,
    landingPath: body?.path,
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    utmSource: body?.utmSource ?? null,
    utmMedium: body?.utmMedium ?? null,
    utmCampaign: body?.utmCampaign ?? null,
    utmTerm: body?.utmTerm ?? null,
    utmContent: body?.utmContent ?? null,
    headers: request.headers,
  });

  if (!result.ok && result.status === 404) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AFFILIATE_COOKIE, ref, {
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
  response.cookies.set(AFFILIATE_VISITOR_COOKIE, result.visitorId, {
    path: "/",
    maxAge: AFFILIATE_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set(AFFILIATE_SESSION_COOKIE, result.visitorSessionId, {
    path: "/",
    maxAge: AFFILIATE_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

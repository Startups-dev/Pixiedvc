import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getAppBaseUrl } from "@/lib/app-url";

const PRODUCTION_REFERRAL_DESTINATION_ORIGIN = "https://pixiedvc.com";

function getReferralDestinationOrigin(request: NextRequest) {
  const configuredBaseUrl = getAppBaseUrl();
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_REFERRAL_DESTINATION_ORIGIN;
  }

  return new URL(request.url).origin;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const supabase = createRouteHandlerClient({ cookies });

  const { data, error } = await supabase.rpc("resolve_affiliate", { slug_or_code: decodedSlug });

  if (error || !data || data.length === 0) {
    const fallback = new URL("/", getReferralDestinationOrigin(request));
    return NextResponse.redirect(fallback);
  }

  const url = new URL(request.url);
  const rawTo = url.searchParams.get("to") ?? "/";
  const landingPath = rawTo.startsWith("/") ? rawTo : "/";

  const destination = new URL(landingPath, getReferralDestinationOrigin(request));
  destination.searchParams.set("ref", decodedSlug);
  return NextResponse.redirect(destination);
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const supabase = createRouteHandlerClient({ cookies });

  const { data, error } = await supabase.rpc("resolve_affiliate", { slug_or_code: decodedSlug });

  if (error || !data || data.length === 0) {
    const fallback = new URL("/", request.url);
    return NextResponse.redirect(fallback);
  }

  const url = new URL(request.url);
  const rawTo = url.searchParams.get("to") ?? "/";
  const landingPath = rawTo.startsWith("/") ? rawTo : "/";

  const destination = new URL(landingPath, request.url);
  destination.searchParams.set("ref", decodedSlug);
  return NextResponse.redirect(destination);
}

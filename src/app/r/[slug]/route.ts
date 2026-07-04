import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(request.url);
  url.pathname = `/go/${encodeURIComponent(slug)}`;
  return NextResponse.redirect(url, 308);
}

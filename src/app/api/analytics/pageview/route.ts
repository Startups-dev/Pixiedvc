import { NextResponse } from "next/server";
import { recordPageview } from "@/lib/analytics/server";

export async function POST(request: Request) {
  try {
    await recordPageview(request);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "analytics_pageview_failed" },
      { status: 400 },
    );
  }
}

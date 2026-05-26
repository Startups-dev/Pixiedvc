import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/analytics/server";

export async function POST(request: Request) {
  try {
    await recordEvent(request);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "analytics_event_failed" },
      { status: 400 },
    );
  }
}

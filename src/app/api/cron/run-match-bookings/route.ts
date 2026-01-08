import { NextResponse } from "next/server";

export async function GET() {
  const secret = process.env.CRON_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }

  if (!baseUrl) {
    return NextResponse.json({ error: "Site URL not set" }, { status: 500 });
  }

  const url = baseUrl.startsWith("http")
    ? `${baseUrl}/api/cron/match-bookings`
    : `https://${baseUrl}/api/cron/match-bookings`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-cron-secret": secret,
        "content-type": "application/json",
      },
      body: JSON.stringify({ source: "vercel-cron" }),
      cache: "no-store",
      signal: controller.signal,
    });

    const upstreamText = await res.text();
    let upstreamPayload: unknown = upstreamText;
    try {
      upstreamPayload = JSON.parse(upstreamText);
    } catch {
      // Keep raw text when JSON parsing fails.
    }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      elapsed_ms: Date.now() - started,
      upstream: upstreamPayload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        elapsed_ms: Date.now() - started,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

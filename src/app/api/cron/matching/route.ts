import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runAdminMatcher } from "@/lib/admin/matching";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Vercel Cron sends: x-vercel-cron: 1
function isVercelCron(req: NextRequest) {
  return req.headers.get("x-vercel-cron") === "1";
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

async function runWithLock() {
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const lockName = "match-bookings-cron";

  // Acquire lock (insert row). If it already exists, skip.
  const { error: lockErr } = await supabaseAdmin
    .from("job_locks")
    .insert({ name: lockName })
    .select("name")
    .single();

  if (lockErr) {
    return { ok: true, skipped: true, reason: "already_running" as const };
  }

  try {
    const result = await runAdminMatcher({ dryRun: false });
    return { ok: true, cron: true, ...result };
  } catch (err: any) {
    return { ok: false, cron: true, error: err?.message ?? "Unknown error" };
  } finally {
    await supabaseAdmin.from("job_locks").delete().eq("name", lockName);
  }
}

// Vercel Cron uses GET
export async function GET(req: NextRequest) {
  if (!isVercelCron(req)) return unauthorized();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase env vars" },
      { status: 500 }
    );
  }

  const payload = await runWithLock();
  const status = payload.ok ? 200 : 500;
  return NextResponse.json(payload, { status });
}

// Optional: allow manual POST runs using CRON_SECRET (handy for testing)
// If you don't want this, delete the POST handler entirely.
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!CRON_SECRET || token !== CRON_SECRET) return unauthorized();

  const payload = await runWithLock();
  const status = payload.ok ? 200 : 500;
  return NextResponse.json(payload, { status });
}

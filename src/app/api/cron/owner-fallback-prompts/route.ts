import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

  const lockName = "owner-fallback-prompt-cron";

  const { error: lockErr } = await supabaseAdmin
    .from("job_locks")
    .insert({ name: lockName })
    .select("name")
    .single();

  if (lockErr) {
    return { ok: true, skipped: true, reason: "already_running" as const };
  }

  try {
    const now = new Date();
    const promptAfter = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("owner_memberships")
      .select(
        "id, owner_id, matching_mode, allow_standard_rate_fallback, premium_only_listed_at, last_fallback_prompted_at, fallback_remind_at, points_available",
      )
      .eq("matching_mode", "premium_only")
      .eq("allow_standard_rate_fallback", false)
      .not("premium_only_listed_at", "is", null)
      .gt("points_available", 0);

    if (membershipError) {
      return { ok: false, error: membershipError.message };
    }

    const eligible = (memberships ?? []).filter((membership) => {
      if (!membership.premium_only_listed_at) return false;
      if (new Date(membership.premium_only_listed_at).toISOString() > promptAfter) return false;
      if (membership.fallback_remind_at && new Date(membership.fallback_remind_at) > now) return false;
      if (membership.last_fallback_prompted_at) {
        const lastPrompt = new Date(membership.last_fallback_prompted_at);
        const listedAt = new Date(membership.premium_only_listed_at);
        if (lastPrompt >= listedAt) return false;
      }
      return true;
    });

    let created = 0;

    for (const membership of eligible) {
      const link = `/owner/notifications?membershipId=${membership.id}&prompt=premium_fallback`;

      const { data: existing } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("user_id", membership.owner_id)
        .eq("type", "premium_fallback_prompt")
        .eq("link", link)
        .is("read_at", null)
        .limit(1);

      if (existing && existing.length > 0) {
        continue;
      }

      const { error: insertError } = await supabaseAdmin.from("notifications").insert({
        user_id: membership.owner_id,
        type: "premium_fallback_prompt",
        title: "Open your points to standard matching?",
        body: "We haven’t matched your points within the premium window yet. Would you like to allow standard matching to increase the chance of renting?",
        link,
      });

      if (insertError) {
        console.error("Failed to insert fallback prompt", insertError);
        continue;
      }

      await supabaseAdmin
        .from("owner_memberships")
        .update({ last_fallback_prompted_at: now.toISOString() })
        .eq("id", membership.id);

      created += 1;
    }

    return { ok: true, created, evaluated: eligible.length };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Unknown error" };
  } finally {
    await supabaseAdmin.from("job_locks").delete().eq("name", lockName);
  }
}

export async function GET(req: NextRequest) {
  if (!isVercelCron(req)) return unauthorized();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase env vars" },
      { status: 500 },
    );
  }

  const payload = await runWithLock();
  const status = payload.ok ? 200 : 500;
  return NextResponse.json(payload, { status });
}

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!CRON_SECRET || token !== CRON_SECRET) return unauthorized();

  const payload = await runWithLock();
  const status = payload.ok ? 200 : 500;
  return NextResponse.json(payload, { status });
}

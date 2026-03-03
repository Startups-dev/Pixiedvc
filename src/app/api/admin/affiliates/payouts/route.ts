import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminEmail } from "@/lib/require-admin";

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function isoDateOnly(d: Date) {
  // Always produce YYYY-MM-DD in UTC for DATE columns
  return d.toISOString().slice(0, 10);
}

async function findOverlappingRuns(
  client: any,
  rangeStartValue: string,
  rangeEndValue: string
) {
  // Inclusive overlap: existing.period_end >= new.start AND existing.period_start <= new.end
  const { data, error } = await client
    .from("affiliate_payout_runs")
    .select("id, period_start, period_end, status, created_at")
    .gte("period_end", rangeStartValue)
    .lte("period_start", rangeEndValue)
    .order("period_start", { ascending: true });

  return { data: data ?? [], error };
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  try {
    requireAdminEmail(user?.email);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const { period_start, period_end } = payload ?? {};

  if (!period_start || !period_end) {
    return NextResponse.json({ error: "Missing period dates" }, { status: 400 });
  }

  const start = startOfDay(new Date(period_start));
  const end = endOfDay(new Date(period_end));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const rangeStartValue = isoDateOnly(start);
  const rangeEndValue = isoDateOnly(end);

  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: "Server misconfigured: missing service role client" },
      { status: 500 },
    );
  }

  // First: pre-check overlap to give a nice error before we try insert
  const { data: existingRuns, error: existingRunsError } =
    await findOverlappingRuns(client, rangeStartValue, rangeEndValue);

  if (existingRunsError) {
    return NextResponse.json({ error: existingRunsError.message }, { status: 400 });
  }

  const exactMatch = existingRuns.find(
    (r) => r.period_start === rangeStartValue && r.period_end === rangeEndValue
  );
  if (exactMatch) {
    return NextResponse.json(
      { error: "A payout run for this period already exists.", existing_run: exactMatch },
      { status: 400 }
    );
  }

  if (existingRuns.length > 0) {
    return NextResponse.json(
      { error: "This payout period overlaps an existing run.", overlapping_runs: existingRuns },
      { status: 400 }
    );
  }

  type EligibleConversion = {
    id: string;
    affiliate_id: string;
    booking_request_id: string;
    commission_amount_usd: number | null;
    booking_amount_usd: number | null;
    commission_rate: number | null;
    status: string | null;
    confirmed_at: string | null;
  };

  const { data: conversions, error: conversionError } = await client
    .from("affiliate_conversions")
    .select(
      "id, affiliate_id, booking_request_id, commission_amount_usd, booking_amount_usd, commission_rate, status, confirmed_at, payout_run_id",
    )
    .eq("status", "approved")
    .is("payout_run_id", null)
    .not("confirmed_at", "is", null)
    .gte("confirmed_at", start.toISOString())
    .lte("confirmed_at", end.toISOString());

  if (conversionError) {
    return NextResponse.json({ error: conversionError.message }, { status: 400 });
  }

  const eligible = ((conversions ?? []) as EligibleConversion[]).filter((row) => {
    const commission = Number(row.commission_amount_usd ?? 0);
    return Number.isFinite(commission) && commission > 0;
  });

  const runStatus = eligible.length > 0 ? "ready" : "draft";

  const { data: payoutRun, error: runError } = await client
    .from("affiliate_payout_runs")
    .insert({
      period_start: rangeStartValue,
      period_end: rangeEndValue,
      status: runStatus,
      notes: null,
    })
    .select("id, period_start, period_end, status")
    .single();

  if (runError) {
    if (runError.code === "23505") {
      const { data: conflicts } = await findOverlappingRuns(client, rangeStartValue, rangeEndValue);
      const exact = (conflicts ?? []).find(
        (r: any) => r.period_start === rangeStartValue && r.period_end === rangeEndValue
      );
      return NextResponse.json(
        { error: "A payout run for this period already exists.", existing_run: exact ?? null },
        { status: 400 }
      );
    }

    if (runError.code === "23P01") {
      const { data: overlaps } = await findOverlappingRuns(client, rangeStartValue, rangeEndValue);
      return NextResponse.json(
        { error: "Payout period overlaps an existing run.", overlapping_runs: overlaps ?? [] },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: runError.message }, { status: 400 });
  }

  if (!payoutRun) {
    return NextResponse.json({ error: "Unable to create payout run" }, { status: 400 });
  }

  if (eligible.length > 0) {
    const items = eligible.map((entry) => ({
      payout_run_id: payoutRun.id,
      affiliate_id: entry.affiliate_id,
      conversion_id: entry.id,
      amount_usd: Number(entry.commission_amount_usd ?? 0),
      booking_count: 1,
      booking_request_ids: [entry.booking_request_id],
      status: "scheduled",
    }));

    const { error: itemError } = await client
      .from("affiliate_payout_items")
      .upsert(items, { onConflict: "conversion_id" });

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 400 });
    }

    const { error: conversionUpdateError } = await client
      .from("affiliate_conversions")
      .update({ payout_run_id: payoutRun.id })
      .in("id", eligible.map((row) => row.id));

    if (conversionUpdateError) {
      return NextResponse.json({ error: conversionUpdateError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    ok: true,
    payout_run_id: payoutRun.id,
    period_start: rangeStartValue,
    period_end: rangeEndValue,
    conversion_count: eligible.length,
  });
}

export async function PATCH(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  try {
    requireAdminEmail(user?.email);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const { action } = payload ?? {};

  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: "Server misconfigured: missing service role client" },
      { status: 500 },
    );
  }

  if (action === "mark_item_paid") {
    const { item_id, payout_reference, paid_at } = payload ?? {};
    if (!item_id) {
      return NextResponse.json({ error: "Missing payout item id" }, { status: 400 });
    }

    const paidAt = paid_at ? new Date(paid_at) : new Date();
    if (Number.isNaN(paidAt.getTime())) {
      return NextResponse.json({ error: "Invalid paid date" }, { status: 400 });
    }

    const { error } = await client
      .from("affiliate_payout_items")
      .update({
        status: "paid",
        paid_at: paidAt.toISOString(),
        payout_reference: payout_reference ?? null,
      })
      .eq("id", item_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "void_item") {
    const { item_id } = payload ?? {};
    if (!item_id) {
      return NextResponse.json({ error: "Missing payout item id" }, { status: 400 });
    }

    const { error } = await client
      .from("affiliate_payout_items")
      .update({ status: "void", paid_at: null })
      .eq("id", item_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "mark_run_paid") {
    const { run_id } = payload ?? {};
    if (!run_id) {
      return NextResponse.json({ error: "Missing payout run id" }, { status: 400 });
    }

    const { error } = await client
      .from("affiliate_payout_runs")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", run_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

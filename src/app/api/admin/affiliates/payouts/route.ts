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
  return d.toISOString().slice(0, 10);
}

function asPositiveNumber(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function findOverlappingRuns(client: any, rangeStartValue: string, rangeEndValue: string) {
  const { data, error } = await client
    .from("affiliate_payout_runs")
    .select("id, period_start, period_end, status, created_at")
    .gte("period_end", rangeStartValue)
    .lte("period_start", rangeEndValue)
    .order("period_start", { ascending: true });

  return { data: data ?? [], error };
}

async function getAdminContext() {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  try {
    requireAdminEmail(user?.email);
  } catch {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return {
      user,
      error: NextResponse.json(
        { error: "Server misconfigured: missing service role client" },
        { status: 500 },
      ),
    };
  }

  return { user, client, error: null };
}

export async function POST(request: Request) {
  const { user, client, error: authError } = await getAdminContext();
  if (authError) return authError;
  if (!user || !client) {
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

  const { data: existingRuns, error: existingRunsError } =
    await findOverlappingRuns(client, rangeStartValue, rangeEndValue);

  if (existingRunsError) {
    return NextResponse.json({ error: existingRunsError.message }, { status: 400 });
  }

  const exactMatch = existingRuns.find(
    (run: any) => run.period_start === rangeStartValue && run.period_end === rangeEndValue,
  );
  if (exactMatch) {
    return NextResponse.json(
      { error: "A payout run for this period already exists.", existing_run: exactMatch },
      { status: 400 },
    );
  }

  if (existingRuns.length > 0) {
    return NextResponse.json(
      { error: "This payout period overlaps an existing run.", overlapping_runs: existingRuns },
      { status: 400 },
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
    payout_run_id: string | null;
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
    const commission = asPositiveNumber(row.commission_amount_usd);
    return Boolean(commission);
  });

  const { data: payoutRun, error: runError } = await client
    .from("affiliate_payout_runs")
    .insert({
      period_start: rangeStartValue,
      period_end: rangeEndValue,
      status: eligible.length > 0 ? "ready" : "draft",
      notes: null,
      created_by: user.id,
    })
    .select("id, period_start, period_end, status")
    .single();

  if (runError) {
    if (runError.code === "23505") {
      const { data: conflicts } = await findOverlappingRuns(client, rangeStartValue, rangeEndValue);
      const exact = (conflicts ?? []).find(
        (run: any) => run.period_start === rangeStartValue && run.period_end === rangeEndValue,
      );
      return NextResponse.json(
        { error: "A payout run for this period already exists.", existing_run: exact ?? null },
        { status: 400 },
      );
    }

    if (runError.code === "23P01") {
      const { data: overlaps } = await findOverlappingRuns(client, rangeStartValue, rangeEndValue);
      return NextResponse.json(
        { error: "Payout period overlaps an existing run.", overlapping_runs: overlaps ?? [] },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: runError.message }, { status: 400 });
  }

  if (!payoutRun) {
    return NextResponse.json({ error: "Unable to create payout run" }, { status: 400 });
  }

  if (eligible.length > 0) {
    const items = eligible.map((entry) => {
      const commissionAmount = Number(entry.commission_amount_usd ?? 0);
      return {
        payout_run_id: payoutRun.id,
        affiliate_id: entry.affiliate_id,
        conversion_id: entry.id,
        booking_request_id: entry.booking_request_id,
        booking_amount_usd: entry.booking_amount_usd,
        commission_rate: entry.commission_rate,
        commission_amount_usd: entry.commission_amount_usd,
        amount_usd: commissionAmount,
        original_amount_usd: commissionAmount,
        booking_count: 1,
        booking_request_ids: [entry.booking_request_id],
        status: "pending",
      };
    });

    const { error: itemError } = await client.from("affiliate_payout_items").insert(items);

    if (itemError) {
      await client.from("affiliate_payout_runs").delete().eq("id", payoutRun.id);
      return NextResponse.json({ error: itemError.message }, { status: 400 });
    }

    const { error: conversionUpdateError } = await client
      .from("affiliate_conversions")
      .update({ payout_run_id: payoutRun.id })
      .in(
        "id",
        eligible.map((row) => row.id),
      );

    if (conversionUpdateError) {
      await client.from("affiliate_payout_items").delete().eq("payout_run_id", payoutRun.id);
      await client.from("affiliate_payout_runs").delete().eq("id", payoutRun.id);
      return NextResponse.json({ error: conversionUpdateError.message }, { status: 400 });
    }
  }

  console.info("[affiliate-payout-audit]", {
    action: "create_payout_run",
    payout_run_id: payoutRun.id,
    admin_user_id: user.id,
    result: "ok",
  });

  return NextResponse.json({
    ok: true,
    payout_run_id: payoutRun.id,
    period_start: rangeStartValue,
    period_end: rangeEndValue,
    conversion_count: eligible.length,
  });
}

export async function PATCH(request: Request) {
  const { user, client, error: authError } = await getAdminContext();
  if (authError) return authError;
  if (!user || !client) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const { action } = payload ?? {};
  const nowIso = new Date().toISOString();

  if (action === "mark_item_paid") {
    const { item_id } = payload ?? {};
    if (!item_id) {
      return NextResponse.json({ error: "Missing payout item id" }, { status: 400 });
    }

    const { data: item, error: itemLookupError } = await client
      .from("affiliate_payout_items")
      .select("id, status, conversion_id")
      .eq("id", item_id)
      .maybeSingle();

    if (itemLookupError || !item) {
      return NextResponse.json({ error: itemLookupError?.message ?? "Payout item not found" }, { status: 404 });
    }

    if (item.status === "void") {
      return NextResponse.json({ error: "Voided payout items cannot be marked paid." }, { status: 400 });
    }

    const paymentMethod = cleanText(payload?.payment_method) ?? "manual";
    const paymentReference = cleanText(payload?.payment_reference ?? payload?.payout_reference);
    const paymentNotes = cleanText(payload?.payment_notes);

    const { error } = await client
      .from("affiliate_payout_items")
      .update({
        status: "paid",
        paid_at: nowIso,
        paid_by: user.id,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_notes: paymentNotes,
        payout_reference: paymentReference,
        updated_at: nowIso,
      })
      .eq("id", item_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (item.conversion_id) {
      await client
        .from("affiliate_conversions")
        .update({ status: "paid", updated_at: nowIso })
        .eq("id", item.conversion_id);
    }

    console.info("[affiliate-payout-audit]", {
      action: "mark_item_paid",
      payout_item_id: item_id,
      admin_user_id: user.id,
      result: "ok",
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "void_item") {
    const { item_id, allow_paid_void } = payload ?? {};
    if (!item_id) {
      return NextResponse.json({ error: "Missing payout item id" }, { status: 400 });
    }

    const reason = cleanText(payload?.void_reason);
    if (!reason) {
      return NextResponse.json({ error: "Void reason is required." }, { status: 400 });
    }

    const { data: item, error: itemLookupError } = await client
      .from("affiliate_payout_items")
      .select("id, status")
      .eq("id", item_id)
      .maybeSingle();

    if (itemLookupError || !item) {
      return NextResponse.json({ error: itemLookupError?.message ?? "Payout item not found" }, { status: 404 });
    }

    if (item.status === "paid" && allow_paid_void !== true) {
      return NextResponse.json(
        { error: "Paid payout items require explicit confirmation before voiding." },
        { status: 400 },
      );
    }

    const update: Record<string, unknown> = {
      status: "void",
      voided_by: user.id,
      voided_at: nowIso,
      void_reason: reason,
      updated_at: nowIso,
    };
    if (item.status !== "paid") {
      update.paid_at = null;
    }

    const { error } = await client.from("affiliate_payout_items").update(update).eq("id", item_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.info("[affiliate-payout-audit]", {
      action: "void_item",
      payout_item_id: item_id,
      admin_user_id: user.id,
      result: "ok",
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "adjust_item") {
    const { item_id } = payload ?? {};
    if (!item_id) {
      return NextResponse.json({ error: "Missing payout item id" }, { status: 400 });
    }

    const nextAmount = asPositiveNumber(payload?.amount_usd);
    if (!nextAmount) {
      return NextResponse.json({ error: "Adjustment amount must be greater than zero." }, { status: 400 });
    }

    const reason = cleanText(payload?.adjustment_reason);
    if (!reason) {
      return NextResponse.json({ error: "Adjustment reason is required." }, { status: 400 });
    }

    const { data: item, error: itemLookupError } = await client
      .from("affiliate_payout_items")
      .select("id, status, amount_usd, original_amount_usd")
      .eq("id", item_id)
      .maybeSingle();

    if (itemLookupError || !item) {
      return NextResponse.json({ error: itemLookupError?.message ?? "Payout item not found" }, { status: 404 });
    }

    if (item.status === "paid" || item.status === "void") {
      return NextResponse.json({ error: "Only unpaid, non-void payout items can be adjusted." }, { status: 400 });
    }

    const { error } = await client
      .from("affiliate_payout_items")
      .update({
        amount_usd: nextAmount,
        original_amount_usd: item.original_amount_usd ?? item.amount_usd,
        adjusted_by: user.id,
        adjusted_at: nowIso,
        adjustment_reason: reason,
        updated_at: nowIso,
      })
      .eq("id", item_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.info("[affiliate-payout-audit]", {
      action: "adjust_item",
      payout_item_id: item_id,
      admin_user_id: user.id,
      result: "ok",
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "mark_run_paid") {
    const { run_id } = payload ?? {};
    if (!run_id) {
      return NextResponse.json({ error: "Missing payout run id" }, { status: 400 });
    }

    const { data: items, error: itemsError } = await client
      .from("affiliate_payout_items")
      .select("id, status")
      .eq("payout_run_id", run_id);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 400 });
    }

    const payableItems = (items ?? []).filter((item: { status: string | null }) => item.status !== "void");
    if (payableItems.length === 0) {
      return NextResponse.json({ error: "No payable items exist for this run." }, { status: 400 });
    }

    const unpaid = payableItems.filter((item: { status: string | null }) => item.status !== "paid");
    if (unpaid.length > 0) {
      return NextResponse.json(
        { error: "All non-void payout items must be paid before marking the run paid." },
        { status: 400 },
      );
    }

    const { error } = await client
      .from("affiliate_payout_runs")
      .update({
        status: "paid",
        paid_at: nowIso,
        paid_by: user.id,
        payment_method: cleanText(payload?.payment_method) ?? "manual",
        payment_reference: cleanText(payload?.payment_reference),
        payment_notes: cleanText(payload?.payment_notes),
        updated_at: nowIso,
      })
      .eq("id", run_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.info("[affiliate-payout-audit]", {
      action: "mark_run_paid",
      payout_run_id: run_id,
      admin_user_id: user.id,
      result: "ok",
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

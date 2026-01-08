import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { calculateCommission } from "@/lib/affiliate-commissions";

type AffiliateRow = {
  id: string;
  referral_code: string | null;
  slug: string;
  commission_rate: number;
};

type BookingRow = {
  id: string;
  referral_code: string | null;
  created_at: string;
  status: string | null;
  booking_amount?: number | null;
};

const QUALIFIED_STATUSES = ["confirmed"];
const AMOUNT_FIELD_CANDIDATES = ["booking_amount_usd", "total_amount_usd", "total_usd", "amount_usd"];

function normalizeCode(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

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

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { period_start, period_end } = payload ?? {};

  if (!period_start || !period_end) {
    return NextResponse.json({ error: "Missing period dates" }, { status: 400 });
  }

  const start = startOfDay(new Date(period_start));
  const end = endOfDay(new Date(period_end));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const client = getSupabaseAdminClient() ?? authClient;

  let statusFilterApplied = true;
  const { data: affiliates, error: affiliateError } = await client
    .from("affiliates")
    .select("id, referral_code, slug, commission_rate");

  if (affiliateError) {
    return NextResponse.json({ error: affiliateError.message }, { status: 400 });
  }

  const fetchBookings = async (select: string) => {
    const baseQuery = client
      .from("booking_requests")
      .select(select)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    const { data, error } = statusFilterApplied
      ? await baseQuery.in("status", QUALIFIED_STATUSES)
      : await baseQuery;

    if (error && statusFilterApplied && error.message?.includes("status")) {
      statusFilterApplied = false;
      return client
        .from("booking_requests")
        .select(select)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
    }

    return { data, error };
  };

  let bookings: BookingRow[] = [];
  let amountField: string | null = null;
  let bookingError: { message: string } | null = null;

  for (const candidate of AMOUNT_FIELD_CANDIDATES) {
    const { data, error } = await fetchBookings(`id, referral_code, created_at, status, ${candidate}`);
    if (!error) {
      bookings = (data ?? []).map((row) => {
        const rawAmount = (row as Record<string, number | null>)[candidate];
        return {
          ...(row as BookingRow),
          booking_amount: rawAmount === null || rawAmount === undefined ? null : Number(rawAmount),
        };
      });
      amountField = candidate;
      bookingError = null;
      break;
    }

    if (!error?.message?.includes(candidate)) {
      bookingError = error ?? null;
      break;
    }
  }

  if (!amountField && !bookingError) {
    const { data, error } = await fetchBookings("id, referral_code, created_at, status");
    if (error) {
      bookingError = error;
    } else {
      bookings = (data ?? []) as BookingRow[];
    }
  }

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 400 });
  }

  const affiliateLookup = new Map<string, AffiliateRow>();
  (affiliates ?? []).forEach((affiliate) => {
    const code = normalizeCode(affiliate.referral_code);
    const slug = normalizeCode(affiliate.slug);
    if (code) affiliateLookup.set(code, affiliate);
    if (slug) affiliateLookup.set(slug, affiliate);
  });

  const grouped = new Map<string, { affiliate: AffiliateRow; bookingIds: string[]; totalAmount: number }>();
  let unmatched = 0;
  let missingAmounts = 0;

  (bookings ?? []).forEach((booking) => {
    const key = normalizeCode(booking.referral_code);
    if (!key) return;
    const affiliate = affiliateLookup.get(key);
    if (!affiliate) {
      unmatched += 1;
      return;
    }

    const entry = grouped.get(affiliate.id) ?? { affiliate, bookingIds: [], totalAmount: 0 };
    entry.bookingIds.push(booking.id);
    if (amountField) {
      if (booking.booking_amount === null || Number.isNaN(Number(booking.booking_amount))) {
        missingAmounts += 1;
      } else {
        entry.totalAmount += Number(booking.booking_amount);
      }
    }
    grouped.set(affiliate.id, entry);
  });

  const missingAmountField = !amountField;
  const notes = [
    missingAmountField ? "Missing booking amount field; amounts set to 0." : null,
    missingAmounts > 0 ? `Missing booking amounts for ${missingAmounts} bookings; amounts set to 0.` : null,
    statusFilterApplied ? null : "Status field missing; totals unverified.",
  ]
    .filter(Boolean)
    .join(" ") || null;
  const runStatus = grouped.size > 0 ? "ready" : "draft";

  const { data: payoutRun, error: runError } = await client
    .from("affiliate_payout_runs")
    .insert({
      period_start,
      period_end,
      status: runStatus,
      notes,
    })
    .select("id")
    .single();

  if (runError || !payoutRun) {
    return NextResponse.json({ error: runError?.message ?? "Unable to create payout run" }, { status: 400 });
  }

  if (grouped.size > 0) {
    const items = Array.from(grouped.values()).map((entry) => ({
      payout_run_id: payoutRun.id,
      affiliate_id: entry.affiliate.id,
      amount_usd: calculateCommission(entry.totalAmount, entry.affiliate.commission_rate),
      booking_count: entry.bookingIds.length,
      booking_request_ids: entry.bookingIds,
      status: "scheduled",
    }));

    const { error: itemError } = await client.from("affiliate_payout_items").insert(items);
    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    ok: true,
    payout_run_id: payoutRun.id,
    missing_amount_field: missingAmountField,
    missing_amount_count: missingAmounts,
    amount_field: amountField,
    status_filter_applied: statusFilterApplied,
    unmatched_referrals: unmatched,
  });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { action } = payload ?? {};

  const client = getSupabaseAdminClient() ?? authClient;

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

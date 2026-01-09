import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { affiliate_id, period_start, period_end, status, paypal_reference } = payload ?? {};

  if (!affiliate_id || !period_start || !period_end) {
    return NextResponse.json({ error: "Missing payout details" }, { status: 400 });
  }

  const client = getSupabaseAdminClient() ?? authClient;

  const { data: conversions, error: conversionError } = await client
    .from("affiliate_conversions")
    .select("id, commission_amount_usd")
    .eq("affiliate_id", affiliate_id)
    .eq("status", "approved")
    .is("payout_id", null)
    .gte("confirmed_at", period_start)
    .lte("confirmed_at", period_end);

  if (conversionError) {
    return NextResponse.json({ error: conversionError.message }, { status: 400 });
  }

  const totalAmount =
    (conversions ?? []).reduce((sum, row) => sum + Number(row.commission_amount_usd ?? 0), 0) || 0;

  const { data: payout, error: payoutError } = await client
    .from("affiliate_payouts")
    .insert({
      affiliate_id,
      period_start,
      period_end,
      status: status ?? "processing",
      total_amount_usd: totalAmount,
      paypal_reference: paypal_reference ?? null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (payoutError || !payout) {
    return NextResponse.json({ error: payoutError?.message ?? "Unable to create payout" }, { status: 400 });
  }

  if (conversions && conversions.length > 0) {
    const nextStatus = status === "paid" ? "paid" : "approved";
    const { error: updateError } = await client
      .from("affiliate_conversions")
      .update({ payout_id: payout.id, status: nextStatus })
      .in(
        "id",
        conversions.map((conversion) => conversion.id),
      );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

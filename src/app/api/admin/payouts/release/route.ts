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
  const { payout_id } = payload ?? {};

  if (!payout_id) {
    return NextResponse.json({ error: "Missing payout id" }, { status: 400 });
  }

  const client = getSupabaseAdminClient() ?? authClient;
  const { data: payout, error: fetchError } = await client
    .from("payout_ledger")
    .select("id, rental_id, owner_user_id, stage")
    .eq("id", payout_id)
    .maybeSingle();

  if (fetchError || !payout) {
    return NextResponse.json({ error: fetchError?.message ?? "Payout not found" }, { status: 404 });
  }

  const { error } = await client
    .from("payout_ledger")
    .update({ status: "released", released_at: new Date().toISOString() })
    .eq("id", payout_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const milestoneCode = payout.stage === 70 ? "payout_70_released" : "payout_30_released";
  await client
    .from("rental_milestones")
    .upsert({
      rental_id: payout.rental_id,
      code: milestoneCode,
      status: "completed",
      occurred_at: new Date().toISOString(),
    })
    .eq("rental_id", payout.rental_id)
    .eq("code", milestoneCode);

  await client
    .from("notifications")
    .insert({
      user_id: payout.owner_user_id,
      type: "payout_released",
      title: "Payout released",
      body: `Your ${payout.stage}% payout has been released.`,
      link: `/owner/payouts`,
    });

  return NextResponse.json({ ok: true });
}

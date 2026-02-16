import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getActivePromotion } from "@/lib/pricing-promotions";

export async function POST() {
  const sessionClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role unavailable" }, { status: 500 });
  }

  const { data: activePromotion, error: promoError } = await getActivePromotion({
    adminClient,
  });

  if (promoError) {
    console.error("[guest-rewards] failed to load active promotion", {
      code: (promoError as { code?: string }).code,
      message: promoError.message,
    });
    return NextResponse.json({ error: "Unable to enroll" }, { status: 500 });
  }

  if (!activePromotion) {
    return NextResponse.json({ error: "Enrollment closed" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("profiles")
    .update({ guest_rewards_enrolled_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("guest_rewards_enrolled_at", null)
    .select("guest_rewards_enrolled_at")
    .maybeSingle();

  if (error) {
    console.error("[guest-rewards] failed to enroll", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      user_id: user.id,
    });
    return NextResponse.json({ error: "Unable to enroll" }, { status: 500 });
  }

  return NextResponse.json({ enrolled: Boolean(data?.guest_rewards_enrolled_at) });
}

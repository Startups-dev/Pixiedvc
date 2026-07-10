import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { error: "Legacy affiliate payout creation is disabled. Use /api/admin/affiliates/payouts." },
    { status: 410 },
  );
}

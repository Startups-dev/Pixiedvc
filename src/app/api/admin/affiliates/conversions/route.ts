import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

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
  const { id, status, booking_amount_usd } = payload ?? {};

  if (!id) {
    return NextResponse.json({ error: "Missing conversion id" }, { status: 400 });
  }

  const client = getSupabaseAdminClient() ?? authClient;
  const { error } = await client
    .from("affiliate_conversions")
    .update({
      status: status ?? undefined,
      booking_amount_usd: booking_amount_usd ?? null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

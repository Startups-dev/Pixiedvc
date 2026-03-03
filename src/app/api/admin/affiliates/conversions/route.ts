import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminEmail } from "@/lib/require-admin";

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

  const payload = await request.json();
  const { id, status, booking_amount_usd } = payload ?? {};

  if (!id) {
    return NextResponse.json({ error: "Missing conversion id" }, { status: 400 });
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: "Server misconfigured: missing service role client" },
      { status: 500 },
    );
  }
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

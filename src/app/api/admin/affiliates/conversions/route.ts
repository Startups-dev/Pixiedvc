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
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { id, status, booking_amount_usd, review_notes, void_reason } = payload ?? {};

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

  if (status === "paid") {
    return NextResponse.json(
      { error: "Conversions cannot be marked paid from review. Use affiliate payout items." },
      { status: 400 },
    );
  }

  const nowIso = new Date().toISOString();
  const update: Record<string, unknown> = {
    booking_amount_usd: booking_amount_usd ?? null,
    updated_at: nowIso,
  };

  if (status) {
    update.status = status;
  }

  if (status === "approved") {
    update.reviewed_by = user.id;
    update.reviewed_at = nowIso;
    update.review_notes = typeof review_notes === "string" && review_notes.trim() ? review_notes.trim() : null;
  }

  if (status === "void") {
    const reason = typeof void_reason === "string" ? void_reason.trim() : "";
    if (!reason) {
      return NextResponse.json({ error: "Void reason is required." }, { status: 400 });
    }
    update.voided_by = user.id;
    update.voided_at = nowIso;
    update.void_reason = reason;
  }

  const { error } = await client
    .from("affiliate_conversions")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.info("[affiliate-payout-audit]", {
    action: "review_conversion",
    conversion_id: id,
    admin_user_id: user.id,
    result: "ok",
  });

  return NextResponse.json({ ok: true });
}

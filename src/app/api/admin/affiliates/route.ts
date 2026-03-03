import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminEmail } from "@/lib/require-admin";

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

  const payload = await request.json();
  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: "Server misconfigured: missing service role client" },
      { status: 500 },
    );
  }

  const { error } = await client.from("affiliates").insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
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

  const payload = await request.json();
  const { id, ...rest } = payload ?? {};
  if (!id) {
    return NextResponse.json({ error: "Missing affiliate id" }, { status: 400 });
  }

  const nextStatus = typeof rest?.status === "string" ? rest.status : null;
  const suspendReason = typeof rest?.suspend_reason === "string" ? rest.suspend_reason.trim() : "";
  if (nextStatus === "suspended" && !suspendReason) {
    return NextResponse.json({ error: "Suspend reason is required." }, { status: 400 });
  }

  if (nextStatus && ["verified", "suspended", "rejected"].includes(nextStatus)) {
    rest.reviewed_at = new Date().toISOString();
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: "Server misconfigured: missing service role client" },
      { status: 500 },
    );
  }
  const { error } = await client.from("affiliates").update(rest).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

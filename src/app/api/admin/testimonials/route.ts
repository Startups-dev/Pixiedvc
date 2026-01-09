import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmailStrict } from "@/lib/admin-emails";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmailStrict(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Service role unavailable" }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("testimonial_submissions")
    .select("id, created_at, quote, author, location, email, status, admin_notes")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load submissions" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, submissions: data ?? [] });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmailStrict(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Service role unavailable" }, { status: 500 });
  }

  const body = await request.json();
  const id = String(body?.id ?? "").trim();
  const action = String(body?.action ?? "").trim();
  const adminNotes = String(body?.admin_notes ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Missing submission id" }, { status: 400 });
  }

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const status = action === "approve" ? "approved" : "rejected";

  const { error } = await supabaseAdmin
    .from("testimonial_submissions")
    .update({
      status,
      admin_notes: adminNotes || null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to update submission" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

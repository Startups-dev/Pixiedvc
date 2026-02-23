import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

async function resolveOwner(userId: string, db: any) {
  let { data: owner } = await db
    .from("owners")
    .select("id, user_id, metadata")
    .eq("user_id", userId)
    .maybeSingle();

  if (!owner) {
    owner = (
        await db
          .from("owners")
          .select("id, user_id, metadata")
          .eq("id", userId)
          .maybeSingle()
    ).data;
  }

  if (!owner) {
    await db
      .from("owners")
      .upsert({ id: userId, user_id: userId }, { onConflict: "id" });
    owner = (
        await db
          .from("owners")
          .select("id, user_id, metadata")
          .eq("id", userId)
          .maybeSingle()
    ).data;
  }

  if (owner && !owner.user_id && owner.id === userId) {
    await db
      .from("owners")
      .update({ user_id: userId })
      .eq("id", userId)
      .is("user_id", null);
    owner.user_id = userId;
  }

  return owner;
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    const db =
      getSupabaseAdminClient() ??
      (url && serviceRoleKey
        ? createClient(url, serviceRoleKey, { auth: { persistSession: false } })
        : supabase);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const signedName = String(body?.signedName ?? "").trim();
    if (signedName.length < 3) {
      return NextResponse.json({ ok: false, error: "Please enter your full legal name." }, { status: 400 });
    }

    const owner = await resolveOwner(user.id, db);
    if (!owner) {
      return NextResponse.json({ ok: false, error: "Owner record not found" }, { status: 404 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipFromForwarded = forwardedFor?.split(",")[0]?.trim() ?? null;
    const ip = ipFromForwarded || request.headers.get("x-real-ip") || null;

    const nowIso = new Date().toISOString();
    const { error } = await db
      .from("owners")
      .update({
        agreement_version: "v1",
        agreement_accepted_at: nowIso,
        agreement_signed_name: signedName,
        agreement_accepted_ip: ip,
      })
      .eq("id", owner.id);

    if (error) {
      const missingAgreementColumn =
        error.message.includes("agreement_accepted_at") ||
        error.message.includes("agreement_version") ||
        error.message.includes("agreement_signed_name") ||
        error.message.includes("agreement_accepted_ip");
      if (!missingAgreementColumn) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const metadata = (owner.metadata as Record<string, unknown> | null) ?? {};
      const nextMetadata = {
        ...metadata,
        agreement: {
          ...(typeof metadata.agreement === "object" && metadata.agreement ? metadata.agreement : {}),
          version: "v1",
          accepted_at: nowIso,
          signed_name: signedName,
          accepted_ip: ip,
        },
      };
      const { error: metadataError } = await db
        .from("owners")
        .update({ metadata: nextMetadata })
        .eq("id", owner.id);
      if (metadataError) {
        return NextResponse.json({ ok: false, error: metadataError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[owner/agreement/accept]", error);
    const message = error instanceof Error ? error.message : "Unable to accept agreement";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

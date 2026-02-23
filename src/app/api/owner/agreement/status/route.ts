import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

async function resolveOwner(userId: string, db: any) {
  let { data: owner } = await db
    .from("owners")
    .select("id, user_id, agreement_accepted_at, agreement_version, metadata")
    .eq("user_id", userId)
    .maybeSingle();

  if (!owner) {
    owner = (
        await db
          .from("owners")
          .select("id, user_id, agreement_accepted_at, agreement_version, metadata")
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
          .select("id, user_id, agreement_accepted_at, agreement_version, metadata")
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

export async function GET() {
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

    let owner = await resolveOwner(user.id, db);
    if (!owner) {
      return NextResponse.json({ ok: false, error: "Owner record not found" }, { status: 404 });
    }

    let acceptedAt = owner.agreement_accepted_at ?? null;
    let agreementVersion = owner.agreement_version ?? null;

    // Compatibility mode while DB migration is pending: read from metadata.
    if (acceptedAt == null && agreementVersion == null) {
      const missingColumnError =
        typeof owner === "object" &&
        owner !== null &&
        !Object.prototype.hasOwnProperty.call(owner, "agreement_accepted_at");
      if (missingColumnError) {
        const { data: ownerCompat } = await db
          .from("owners")
          .select("id, user_id, metadata")
          .eq("id", owner.id)
          .maybeSingle();
        owner = ownerCompat ?? owner;
      }
      const metadata = (owner as { metadata?: Record<string, unknown> | null })?.metadata ?? null;
      const metadataAgreement =
        metadata && typeof metadata.agreement === "object"
          ? (metadata.agreement as Record<string, unknown>)
          : null;
      acceptedAt = acceptedAt ?? (typeof metadataAgreement?.accepted_at === "string" ? metadataAgreement.accepted_at : null);
      agreementVersion =
        agreementVersion ?? (typeof metadataAgreement?.version === "string" ? metadataAgreement.version : null);
    }

    return NextResponse.json({
      ok: true,
      ownerId: owner.id,
      acceptedAt,
      agreementVersion,
    });
  } catch (error) {
    console.error("[owner/agreement/status]", error);
    const message = error instanceof Error ? error.message : "Unable to load agreement status";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

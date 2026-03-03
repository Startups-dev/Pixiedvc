import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const bodySchema = z.object({
  ownerLegalName: z.string().trim().min(1).max(200).optional(),
  coOwnerLegalName: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const { ownerLegalName, coOwnerLegalName } = parsed.data;

  const { data: existingOwner } = await admin
    .from("owners")
    .select("id, metadata")
    .eq("user_id", user.id)
    .maybeSingle();

  const ownerId = existingOwner?.id ?? user.id;
  const existingMetadata = (existingOwner?.metadata as Record<string, unknown> | null) ?? {};

  const nextMetadata =
    ownerLegalName || coOwnerLegalName
      ? {
          ...existingMetadata,
          onboarding: {
            ...(typeof existingMetadata.onboarding === "object" && existingMetadata.onboarding
              ? (existingMetadata.onboarding as Record<string, unknown>)
              : {}),
            owner_legal_full_name: ownerLegalName ?? null,
            co_owner_legal_full_name: coOwnerLegalName ?? null,
          },
        }
      : existingMetadata;

  const { error: upsertError } = await admin
    .from("owners")
    .upsert({ id: ownerId, user_id: user.id, metadata: nextMetadata }, { onConflict: "id" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  const { error: repairError } = await admin
    .from("owners")
    .update({ user_id: user.id })
    .eq("id", ownerId)
    .is("user_id", null);

  if (repairError) {
    return NextResponse.json({ error: repairError.message }, { status: 400 });
  }

  const { data: owner, error: ownerError } = await admin
    .from("owners")
    .select("id, user_id, metadata")
    .eq("id", ownerId)
    .maybeSingle();

  if (ownerError) {
    return NextResponse.json({ error: ownerError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, owner });
}

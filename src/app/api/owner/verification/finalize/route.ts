import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type ProofFile = {
  path: string;
  name: string;
  size: number;
  doc_type?: string;
};

const bodySchema = z.object({
  object_path: z.string().trim().min(1),
  doc_type: z.string().trim().min(1).max(120).regex(/^[a-z0-9_-]+$/i),
  original_name: z.string().trim().min(1).max(255),
  size_bytes: z.number().int().positive().max(10 * 1024 * 1024),
});

async function resolveOwnerId(userId: string, admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>) {
  const { data: byUser } = await admin.from("owners").select("id").eq("user_id", userId).maybeSingle();
  if (byUser?.id) return byUser.id;

  const { data: byId } = await admin.from("owners").select("id").eq("id", userId).maybeSingle();
  if (byId?.id) return byId.id;

  await admin.from("owners").upsert({ id: userId, user_id: userId }, { onConflict: "id" });
  return userId;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid finalize payload" }, { status: 400 });
  }

  const { object_path: objectPath, doc_type: docType, original_name: originalName, size_bytes: sizeBytes } = parsed.data;

  if (!objectPath.startsWith(`owners/${user.id}/verification/`)) {
    return NextResponse.json({ error: "Invalid object path" }, { status: 403 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const ownerId = await resolveOwnerId(user.id, admin);

  const { data: existing } = await admin
    .from("owner_verifications")
    .select("proof_files, submitted_at")
    .eq("owner_id", ownerId)
    .maybeSingle();

  const currentProofs = Array.isArray(existing?.proof_files) ? (existing?.proof_files as ProofFile[]) : [];
  const alreadyIncluded = currentProofs.some((file) => file.path === objectPath);
  const nextProofs = alreadyIncluded
    ? currentProofs
    : [...currentProofs, { path: objectPath, name: originalName, size: sizeBytes, doc_type: docType }];

  const submittedAt = existing?.submitted_at ?? new Date().toISOString();

  const payload = {
    owner_id: ownerId,
    status: "submitted",
    submitted_at: submittedAt,
    proof_files: nextProofs,
    updated_at: new Date().toISOString(),
  };

  const { data: verification, error } = await admin
    .from("owner_verifications")
    .upsert(payload, { onConflict: "owner_id" })
    .select("owner_id, status, submitted_at, approved_at, rejected_at, review_notes, proof_files")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, verification });
}

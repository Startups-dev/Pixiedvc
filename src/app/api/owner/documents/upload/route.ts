import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { z } from "zod";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const BUCKET = 'owner-docs';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const allowedDocumentKinds = new Set(["id_front", "id_back", "membership_card", "contract", "other"]);
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

const payloadSchema = z.object({
  kind: z.string().trim().min(1).max(80).optional(),
});

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "owner-document";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const parsed = payloadSchema.safeParse({ kind: formData.get("kind") ?? undefined });
  const kind = parsed.success ? parsed.data.kind ?? "other" : "other";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Please attach a document.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large." }, { status: 400 });
  }

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }

  if (!allowedDocumentKinds.has(kind)) {
    return NextResponse.json({ error: "Unsupported document type." }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: owner } = await adminClient
    .from("owners")
    .select("id, user_id")
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  if (!owner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const path = `${user.id}/${Date.now()}-${safeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 400 });
  }

  const { error } = await adminClient.from('owner_documents').insert({
    owner_id: owner.id,
    kind,
    storage_path: path,
  });

  if (error) {
    return NextResponse.json({ error: "Unable to save document." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

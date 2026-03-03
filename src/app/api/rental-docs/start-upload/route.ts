import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const bucket = "rental-docs";

const mimeToExtension: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const bodySchema = z.object({
  rental_id: z.string().trim().min(1).max(120),
  doc_type: z.string().trim().min(1).max(120).regex(/^[a-z0-9_-]+$/i),
  mime_type: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  size_bytes: z.number().int().positive().max(MAX_SIZE_BYTES),
});

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
    return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: rental } = await admin
    .from("rentals")
    .select("id, owner_user_id")
    .eq("id", parsed.data.rental_id)
    .maybeSingle();

  if (!rental || rental.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = mimeToExtension[parsed.data.mime_type];
  const objectPath = `owners/${user.id}/rental-docs/${parsed.data.rental_id}/${parsed.data.doc_type}/${randomUUID()}.${ext}`;

  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(objectPath);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Unable to start upload" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    bucket,
    object_path: objectPath,
    signed_url: data.signedUrl,
    token: data.token,
    path: data.path,
  });
}

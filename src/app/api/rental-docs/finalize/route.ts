import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const bodySchema = z.object({
  rental_id: z.string().trim().min(1).max(120),
  object_path: z.string().trim().min(1),
  doc_type: z.string().trim().min(1).max(120).regex(/^[a-z0-9_-]+$/i),
  original_name: z.string().trim().min(1).max(255),
  size_bytes: z.number().int().positive().max(10 * 1024 * 1024),
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
    return NextResponse.json({ error: "Invalid finalize payload" }, { status: 400 });
  }

  const { rental_id: rentalId, object_path: objectPath, doc_type: docType, original_name: originalName, size_bytes: sizeBytes } =
    parsed.data;

  if (!objectPath.startsWith(`owners/${user.id}/rental-docs/${rentalId}/`)) {
    return NextResponse.json({ error: "Invalid object path" }, { status: 403 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: rental } = await admin
    .from("rentals")
    .select("id, owner_user_id")
    .eq("id", rentalId)
    .maybeSingle();

  if (!rental || rental.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: document, error } = await admin
    .from("rental_documents")
    .insert({
      rental_id: rentalId,
      type: docType,
      storage_path: objectPath,
      uploaded_by_user_id: user.id,
      meta: { original_name: originalName, size_bytes: sizeBytes },
    })
    .select("id, rental_id, type, storage_path")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, document });
}

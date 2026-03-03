import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const bodySchema = z.object({
  resort_id: z.string().trim().min(1).max(120).nullable().optional(),
  room_type: z.string().trim().min(1).max(120),
  check_in: z.string().trim().min(1),
  check_out: z.string().trim().min(1),
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(20),
  max_price_per_point: z.number().nonnegative().nullable().optional(),
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
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("renter_requests")
    .insert({
      renter_id: user.id,
      resort_id: parsed.data.resort_id ?? null,
      room_type: parsed.data.room_type,
      check_in: parsed.data.check_in,
      check_out: parsed.data.check_out,
      adults: parsed.data.adults,
      children: parsed.data.children,
      max_price_per_point: parsed.data.max_price_per_point ?? null,
      status: "submitted",
    })
    .select("id, renter_id, resort_id, room_type, check_in, check_out, adults, children, max_price_per_point, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, request: data });
}

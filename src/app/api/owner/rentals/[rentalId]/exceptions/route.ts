import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request, { params }: { params: { rentalId: string } }) {
  const cookieStore = await cookies();
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { type, message } = payload ?? {};

  if (!type) {
    return NextResponse.json({ error: "Missing exception type" }, { status: 400 });
  }

  const { rentalId } = params;
  const { data: rental } = await authClient
    .from("rentals")
    .select("id, owner_user_id")
    .eq("id", rentalId)
    .maybeSingle();

  if (!rental || rental.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const client = getSupabaseAdminClient() ?? authClient;
  const { error } = await client
    .from("rental_exceptions")
    .insert({
      rental_id: rentalId,
      owner_user_id: user.id,
      type,
      message: message ?? null,
      status: "open",
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await client
    .from("notifications")
    .insert({
      user_id: user.id,
      type: "exception_request",
      title: "Concierge request submitted",
      body: "We received your request and will follow up shortly.",
      link: `/owner/rentals/${rentalId}`,
    });

  return NextResponse.json({ ok: true });
}

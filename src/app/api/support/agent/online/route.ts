import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(request: Request) {
  const body = await request.json();
  const online = Boolean(body?.online);
  const maxConcurrent =
    typeof body?.maxConcurrent === "number" ? body.maxConcurrent : undefined;

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { error } = await supabase.from("support_agents").upsert(
    {
      user_id: user.id,
      online,
      active: true,
      max_concurrent: maxConcurrent ?? 1,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

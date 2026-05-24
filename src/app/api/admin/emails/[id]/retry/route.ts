import { NextResponse } from "next/server";

import { emailIsAllowedForAdmin } from "@/lib/admin-emails";
import { retryOutboundEmail } from "@/lib/admin/retry-outbound-email";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email ?? null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await retryOutboundEmail(id);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        row: result.row ?? null,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, row: result.row });
}

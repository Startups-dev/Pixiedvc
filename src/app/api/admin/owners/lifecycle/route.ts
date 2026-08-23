import { NextResponse } from "next/server";

import { emailIsAllowedForAdmin } from "@/lib/admin-emails";
import { updateOwnerLifecycleStatus } from "@/lib/owner/lifecycle-admin";
import { OWNER_LIFECYCLE_STATUSES, type OwnerLifecycleStatus } from "@/lib/owner/lifecycle";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const ownerId = typeof payload?.ownerId === "string" ? payload.ownerId.trim() : "";
  const status = typeof payload?.status === "string" ? payload.status.trim() : "";
  const reason = typeof payload?.reason === "string" ? payload.reason.trim() : null;

  if (!ownerId || !status) {
    return NextResponse.json({ error: "Missing ownerId or status." }, { status: 400 });
  }

  if (!OWNER_LIFECYCLE_STATUSES.includes(status as OwnerLifecycleStatus)) {
    return NextResponse.json({ error: "Unsupported lifecycle status." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email ?? null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key not configured." }, { status: 500 });
  }

  const result = await updateOwnerLifecycleStatus({
    client: adminClient,
    ownerId,
    status: status as OwnerLifecycleStatus,
    actorId: user.id,
    reason,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}

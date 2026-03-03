import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminEmail } from "@/lib/require-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

async function ensureUniqueSlug(client: SupabaseClient, base: string) {
  const safeBase = normalizeSlug(base) || "affiliate";

  let candidate = safeBase;
  let index = 2;
  while (index < 200) {
    const { data: existing } = await client
      .from("affiliates")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!existing) return candidate;

    candidate = `${safeBase}-${index}`;
    index += 1;
  }

  return `${safeBase}-${Date.now()}`;
}

async function findAuthUserByEmail(client: SupabaseClient, email: string) {
  const target = email.trim().toLowerCase();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;

    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) return found;

    if (!data.users.length || data.users.length < 200) break;
    page += 1;
  }

  return null;
}

async function ensureAffiliateAuthUser(client: SupabaseClient, email: string, displayName: string) {
  const existing = await findAuthUserByEmail(client, email);
  if (existing?.id) {
    return existing.id;
  }

  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const redirectTo = siteOrigin
    ? `${siteOrigin}/auth/callback?next=${encodeURIComponent("/affiliate/dashboard")}`
    : undefined;
  const invite = await client.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { display_name: displayName },
  });

  if (invite.error) {
    const maybeNowExisting = await findAuthUserByEmail(client, email);
    if (maybeNowExisting?.id) {
      return maybeNowExisting.id;
    }
    throw invite.error;
  }

  return invite.data.user?.id ?? null;
}

export async function PATCH(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  try {
    requireAdminEmail(user?.email);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: "Server misconfigured: missing service role client" },
      { status: 500 },
    );
  }

  const payload = await request.json().catch(() => null);
  const id = payload?.id as string | undefined;
  const action = payload?.action as "approve_basic" | "approve_verified" | "approve_elite" | "reject" | undefined;
  const adminNotesRaw = payload?.admin_notes;
  const adminNotes = typeof adminNotesRaw === "string" ? adminNotesRaw.trim() : "";

  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  const { data: application, error: fetchError } = await client
    .from("affiliate_applications")
    .select(
      "id, display_name, email, website, social_links, traffic_estimate, promotion_description, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (action === "reject") {
    if (!adminNotes) {
      return NextResponse.json({ error: "Reject reason is required." }, { status: 400 });
    }

    const { error: rejectError } = await client
      .from("affiliate_applications")
      .update({
        status: "rejected",
        admin_notes: adminNotes,
        rejected_at: new Date().toISOString(),
        approved_at: null,
      })
      .eq("id", id);

    if (rejectError) {
      return NextResponse.json({ error: rejectError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (application.status !== "pending") {
    return NextResponse.json({ error: "Only pending applications can be approved." }, { status: 400 });
  }

  const displayName = application.display_name?.trim() || application.email.split("@")[0] || "Affiliate";
  const tier = action === "approve_elite" ? "elite" : action === "approve_verified" ? "verified" : "basic";
  const affiliateStatus = action === "approve_basic" ? "pending_review" : "verified";
  const commissionRate = action === "approve_elite" ? 0.08 : action === "approve_verified" ? 0.07 : 0.06;

  const { data: existingAffiliate } = await client
    .from("affiliates")
    .select("id, slug, auth_user_id")
    .eq("email", application.email)
    .maybeSingle();

  let authUserId = existingAffiliate?.auth_user_id ?? null;
  if (!authUserId) {
    authUserId = await ensureAffiliateAuthUser(client, application.email, displayName);
  }

  if (!authUserId) {
    return NextResponse.json({ error: "Unable to create or link affiliate auth user." }, { status: 400 });
  }

  const { error: profileUpsertError } = await client
    .from("profiles")
    .upsert(
      {
        id: authUserId,
        email: application.email,
        display_name: displayName,
        role: "affiliate",
      },
      { onConflict: "id" },
    );

  if (profileUpsertError) {
    return NextResponse.json({ error: profileUpsertError.message }, { status: 400 });
  }

  const basePayload = {
    display_name: displayName,
    email: application.email,
    website: application.website,
    social_links: Array.isArray(application.social_links) ? application.social_links : [],
    traffic_estimate: application.traffic_estimate,
    promotion_description: application.promotion_description,
    tier,
    commission_rate: commissionRate,
    status: affiliateStatus,
    auth_user_id: authUserId,
    review_notes: adminNotes || null,
    reviewed_at: new Date().toISOString(),
    suspend_reason: null,
  };

  if (existingAffiliate?.id) {
    const ensuredSlug =
      typeof existingAffiliate.slug === "string" && existingAffiliate.slug.trim().length > 0
        ? existingAffiliate.slug
        : await ensureUniqueSlug(client, displayName);

    const { error: updateAffiliateError } = await client
      .from("affiliates")
      .update({ ...basePayload, slug: ensuredSlug })
      .eq("id", existingAffiliate.id);

    if (updateAffiliateError) {
      return NextResponse.json({ error: updateAffiliateError.message }, { status: 400 });
    }
  } else {
    const slug = await ensureUniqueSlug(client, displayName);
    const { error: insertAffiliateError } = await client.from("affiliates").insert({
      ...basePayload,
      slug,
    });

    if (insertAffiliateError) {
      return NextResponse.json({ error: insertAffiliateError.message }, { status: 400 });
    }
  }

  const { error: approveError } = await client
    .from("affiliate_applications")
    .update({
      status: "approved",
      admin_notes: adminNotes || null,
      approved_at: new Date().toISOString(),
      rejected_at: null,
    })
    .eq("id", id);

  if (approveError) {
    return NextResponse.json({ error: approveError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

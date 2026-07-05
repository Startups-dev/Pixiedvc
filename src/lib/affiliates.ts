import { supabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { normalizeAffiliateSlug } from "@/lib/affiliate-referrals";

export type AffiliateSummary = {
  id: string;
  displayName: string;
  email: string;
  payoutEmail: string | null;
  slug: string;
  referralCode: string | null;
  commissionRate: number;
  status: string;
  tier: string;
  reviewNotes: string | null;
};

export type AffiliatePayoutRunSummary = {
  id: string;
  status: string;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  created_at: string;
};

export type AffiliatePayoutItemRow = {
  id: string;
  status: string;
  amount_usd: number;
  booking_count: number;
  payout_reference: string | null;
  paid_at: string | null;
  created_at: string;
  payout_run: AffiliatePayoutRunSummary | null;
};

type AffiliateRow = {
  id: string;
  auth_user_id?: string | null;
  display_name: string;
  email: string;
  payout_email?: string | null;
  slug: string;
  referral_code?: string | null;
  commission_rate?: number | string | null;
  status: string;
  tier?: string | null;
  review_notes?: string | null;
};

type AffiliateApplicationRow = {
  id: string;
  status: string | null;
  auth_user_id?: string | null;
  display_name: string | null;
  email: string;
  website?: string | null;
  social_links?: unknown;
  traffic_estimate?: string | null;
  promotion_description?: string | null;
  created_at?: string | null;
};

type EnsureAffiliateResult = {
  affiliate: AffiliateSummary | null;
  blocked: boolean;
};

const AFFILIATE_SELECT =
  "id, auth_user_id, display_name, email, payout_email, slug, referral_code, commission_rate, status, tier, review_notes";

function mapAffiliateRow(row: AffiliateRow): AffiliateSummary {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    payoutEmail: row.payout_email ?? null,
    slug: row.slug,
    referralCode: row.referral_code ?? null,
    commissionRate: Number(row.commission_rate ?? 0),
    status: row.status,
    tier: row.tier ?? "basic",
    reviewNotes: row.review_notes ?? null,
  } satisfies AffiliateSummary;
}

function isMissingAuthUserIdColumn(error: { message?: string; code?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42703" ||
        error.message?.toLowerCase().includes("affiliate_applications.auth_user_id does not exist") ||
        error.message?.toLowerCase().includes("column affiliate_applications.auth_user_id does not exist")),
  );
}

function isRejectedApplicationStatus(status: string | null | undefined) {
  return ["rejected", "declined", "denied"].includes(String(status ?? "").toLowerCase());
}

function isEligibleApplicationStatus(status: string | null | undefined) {
  return ["pending", "approved"].includes(String(status ?? "").toLowerCase());
}

export function isActiveAffiliateStatus(status: string | null | undefined) {
  return ["active", "verified", "approved"].includes(String(status ?? "").toLowerCase());
}

export function isBlockedAffiliateStatus(status: string | null | undefined) {
  return ["pending_review", "suspended", "rejected", "declined", "denied"].includes(
    String(status ?? "").toLowerCase(),
  );
}

async function ensureUniqueAffiliateSlug(client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, base: string) {
  const safeBase = normalizeAffiliateSlug(base) || "affiliate";
  let candidate = safeBase;
  let index = 2;

  while (index < 200) {
    const { data: existing } = await client.from("affiliates").select("id").eq("slug", candidate).maybeSingle();
    if (!existing) return candidate;
    candidate = `${safeBase}-${index}`;
    index += 1;
  }

  return `${safeBase}-${Date.now()}`;
}

export async function getAffiliateForUser(userId: string, email?: string | null) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("affiliates")
    .select(AFFILIATE_SELECT)
    .eq("auth_user_id", userId)
    .maybeSingle();

  const row =
    data ??
    (email
      ? (
          await supabase
            .from("affiliates")
            .select(AFFILIATE_SELECT)
            .eq("email", email)
            .maybeSingle()
        ).data
      : null);

  const admin = getSupabaseAdminClient();
  const adminRow =
    row ??
    (admin
      ? (
          await admin
            .from("affiliates")
            .select(AFFILIATE_SELECT)
            .eq("auth_user_id", userId)
            .maybeSingle()
        ).data ??
        (email
          ? (
              await admin
                .from("affiliates")
                .select(
                  AFFILIATE_SELECT,
                )
                .eq("email", email)
                .maybeSingle()
            ).data
          : null)
      : null);

  if (!adminRow) return null;

  return mapAffiliateRow(adminRow as AffiliateRow);
}

export async function ensureAffiliateForApplicationUser(
  userId: string,
  email?: string | null,
  existingAffiliate?: AffiliateSummary | null,
): Promise<EnsureAffiliateResult> {
  const admin = getSupabaseAdminClient();
  const normalizedEmail = email?.trim().toLowerCase() ?? "";

  if (!admin || !normalizedEmail) {
    return { affiliate: existingAffiliate ?? null, blocked: false };
  }

  const applicationSelect =
    "id, status, auth_user_id, display_name, email, website, social_links, traffic_estimate, promotion_description, created_at";

  const byUserResult = await admin
    .from("affiliate_applications")
    .select(applicationSelect)
    .eq("auth_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const canLinkApplicationAuthUser = !isMissingAuthUserIdColumn(byUserResult.error);
  const byUser = canLinkApplicationAuthUser ? (byUserResult.data as AffiliateApplicationRow | null) : null;

  const byEmailResult = await admin
    .from("affiliate_applications")
    .select(canLinkApplicationAuthUser ? applicationSelect : applicationSelect.replace("auth_user_id, ", ""))
    .eq("email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const byEmail = byEmailResult.data as AffiliateApplicationRow | null;
  const application =
    byUser && byEmail
      ? new Date(byUser.created_at ?? 0).getTime() >= new Date(byEmail.created_at ?? 0).getTime()
        ? byUser
        : byEmail
      : byUser ?? byEmail;

  if (application && isRejectedApplicationStatus(application.status) && !isActiveAffiliateStatus(existingAffiliate?.status)) {
    return { affiliate: null, blocked: true };
  }

  if (!application || !isEligibleApplicationStatus(application.status)) {
    return { affiliate: existingAffiliate ?? null, blocked: false };
  }

  if (canLinkApplicationAuthUser && application.auth_user_id !== userId) {
    await admin.from("affiliate_applications").update({ auth_user_id: userId }).eq("id", application.id);
  }

  const existingByUser = await admin
    .from("affiliates")
    .select(AFFILIATE_SELECT)
    .eq("auth_user_id", userId)
    .maybeSingle();

  const existingByEmail =
    existingByUser.data ??
    (
      await admin
        .from("affiliates")
        .select(AFFILIATE_SELECT)
        .eq("email", normalizedEmail)
        .maybeSingle()
    ).data;

  if (existingByEmail) {
    if (!existingByEmail.auth_user_id) {
      await admin.from("affiliates").update({ auth_user_id: userId }).eq("id", existingByEmail.id);
    }

    return { affiliate: mapAffiliateRow(existingByEmail as AffiliateRow), blocked: false };
  }

  const displayName = application.display_name?.trim() || normalizedEmail.split("@")[0] || "Affiliate";
  const slug = await ensureUniqueAffiliateSlug(admin, displayName);
  const socialLinks = Array.isArray(application.social_links) ? application.social_links : [];

  const { data: insertedAffiliate, error: insertError } = await admin
    .from("affiliates")
    .insert({
      auth_user_id: userId,
      display_name: displayName,
      name: displayName,
      email: normalizedEmail,
      slug,
      status: "active",
      tier: "basic",
      commission_rate: 0.06,
      website: application.website ?? null,
      social_links: socialLinks,
      traffic_estimate: application.traffic_estimate ?? null,
      promotion_description: application.promotion_description ?? null,
      review_notes: null,
      suspend_reason: null,
    })
    .select(AFFILIATE_SELECT)
    .single();

  if (insertError || !insertedAffiliate) {
    return { affiliate: existingAffiliate ?? null, blocked: false };
  }

  return { affiliate: mapAffiliateRow(insertedAffiliate as AffiliateRow), blocked: false };
}

export async function getAffiliatePayoutSummary(affiliateId: string) {
  const supabase = await supabaseServer();

  const pendingPromise = supabase
    .from("affiliate_payout_items")
    .select("amount_usd")
    .eq("affiliate_id", affiliateId)
    .eq("status", "scheduled");

  const lastPaidPromise = supabase
    .from("affiliate_payout_items")
    .select("amount_usd, paid_at, created_at")
    .eq("affiliate_id", affiliateId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [pending, lastPaid] = await Promise.all([pendingPromise, lastPaidPromise]);

  const pendingRows = (pending.data ?? []) as { amount_usd: number | null }[];
  const pendingOwed = pendingRows.reduce((sum, row) => sum + Number(row.amount_usd ?? 0), 0);

  return {
    pendingOwed,
    lastPaidAmount: lastPaid.data?.amount_usd ? Number(lastPaid.data.amount_usd) : 0,
    lastPaidAt: lastPaid.data?.paid_at ?? null,
  };
}

export async function getAffiliatePayoutHistory(affiliateId: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("affiliate_payout_items")
    .select(
      "id, status, amount_usd, booking_count, payout_reference, paid_at, created_at, payout_run:affiliate_payout_runs(id, status, period_start, period_end, paid_at, created_at)"
    )
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false })
    .limit(24);

  return (data ?? []) as unknown as AffiliatePayoutItemRow[];
}

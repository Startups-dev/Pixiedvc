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
  return ["pending_review", "suspended", "rejected", "declined", "denied"].includes(String(status ?? "").toLowerCase());
}

function isHardBlockedAffiliateStatus(status: string | null | undefined) {
  return ["suspended", "rejected", "declined", "denied"].includes(String(status ?? "").toLowerCase());
}

function logAffiliateAccessEvent(
  event: string,
  details: {
    userId?: string | null;
    normalizedEmail?: string | null;
    applicationId?: string | null;
    applicationStatus?: string | null;
    existingAffiliateStatus?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    redirectBranch?: string | null;
  },
) {
  console.info("[affiliate-access]", {
    event,
    userId: details.userId ?? null,
    normalizedEmail: details.normalizedEmail ?? null,
    applicationId: details.applicationId ?? null,
    applicationStatus: details.applicationStatus ?? null,
    existingAffiliateStatus: details.existingAffiliateStatus ?? null,
    errorCode: details.errorCode ?? null,
    errorMessage: details.errorMessage ?? null,
    redirectBranch: details.redirectBranch ?? null,
  });
}

function isAuthUserLinkInsertError(error: { code?: string | null; message?: string | null; details?: string | null } | null) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return (
    text.includes("auth_user_id") ||
    text.includes("foreign key") ||
    text.includes("violates foreign key constraint") ||
    text.includes("affiliates_auth_user_id")
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
    logAffiliateAccessEvent("self_heal_skipped", {
      userId,
      normalizedEmail,
      existingAffiliateStatus: existingAffiliate?.status ?? null,
      redirectBranch: !admin ? "missing_admin_client" : "missing_email",
    });
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
    logAffiliateAccessEvent("application_blocked", {
      userId,
      normalizedEmail,
      applicationId: application.id,
      applicationStatus: application.status,
      existingAffiliateStatus: existingAffiliate?.status ?? null,
      redirectBranch: "rejected_application",
    });
    return { affiliate: null, blocked: true };
  }

  if (!application || !isEligibleApplicationStatus(application.status)) {
    logAffiliateAccessEvent("application_not_eligible", {
      userId,
      normalizedEmail,
      applicationId: application?.id ?? null,
      applicationStatus: application?.status ?? null,
      existingAffiliateStatus: existingAffiliate?.status ?? null,
      redirectBranch: application ? "ineligible_application_status" : "no_application",
    });
    return { affiliate: existingAffiliate ?? null, blocked: false };
  }

  if (canLinkApplicationAuthUser && application.auth_user_id !== userId) {
    const { error: applicationLinkError } = await admin
      .from("affiliate_applications")
      .update({ auth_user_id: userId })
      .eq("id", application.id);

    if (applicationLinkError) {
      logAffiliateAccessEvent("application_link_failed", {
        userId,
        normalizedEmail,
        applicationId: application.id,
        applicationStatus: application.status,
        existingAffiliateStatus: existingAffiliate?.status ?? null,
        errorCode: applicationLinkError.code ?? null,
        errorMessage: applicationLinkError.message ?? null,
      });
    }
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
    if (isHardBlockedAffiliateStatus(existingByEmail.status)) {
      logAffiliateAccessEvent("affiliate_blocked", {
        userId,
        normalizedEmail,
        applicationId: application.id,
        applicationStatus: application.status,
        existingAffiliateStatus: existingByEmail.status,
        redirectBranch: "blocked_affiliate_status",
      });
      return { affiliate: null, blocked: true };
    }

    if (!existingByEmail.auth_user_id) {
      const { error: affiliateLinkError } = await admin
        .from("affiliates")
        .update({ auth_user_id: userId })
        .eq("id", existingByEmail.id);

      if (affiliateLinkError) {
        logAffiliateAccessEvent("affiliate_link_failed", {
          userId,
          normalizedEmail,
          applicationId: application.id,
          applicationStatus: application.status,
          existingAffiliateStatus: existingByEmail.status,
          errorCode: affiliateLinkError.code ?? null,
          errorMessage: affiliateLinkError.message ?? null,
        });
      }
    }

    if (String(existingByEmail.status ?? "").toLowerCase() === "pending_review") {
      const { data: activatedAffiliate, error: activationError } = await admin
        .from("affiliates")
        .update({ status: "active" })
        .eq("id", existingByEmail.id)
        .select(AFFILIATE_SELECT)
        .single();

      if (activationError) {
        logAffiliateAccessEvent("affiliate_activation_failed", {
          userId,
          normalizedEmail,
          applicationId: application.id,
          applicationStatus: application.status,
          existingAffiliateStatus: existingByEmail.status,
          errorCode: activationError.code ?? null,
          errorMessage: activationError.message ?? null,
        });
      }

      if (activatedAffiliate) {
        logAffiliateAccessEvent("affiliate_activation_succeeded", {
          userId,
          normalizedEmail,
          applicationId: application.id,
          applicationStatus: application.status,
          existingAffiliateStatus: existingByEmail.status,
        });
        return { affiliate: mapAffiliateRow(activatedAffiliate as AffiliateRow), blocked: false };
      }
    }

    return { affiliate: mapAffiliateRow(existingByEmail as AffiliateRow), blocked: false };
  }

  const displayName = application.display_name?.trim() || normalizedEmail.split("@")[0] || "Affiliate";
  const slug = await ensureUniqueAffiliateSlug(admin, displayName);
  const socialLinks = Array.isArray(application.social_links) ? application.social_links : [];
  const affiliateInsertPayload = {
    display_name: displayName,
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
  };

  const { data: insertedAffiliate, error: insertError } = await admin
    .from("affiliates")
    .insert({
      ...affiliateInsertPayload,
      auth_user_id: userId,
    })
    .select(AFFILIATE_SELECT)
    .single();

  if (insertError) {
    logAffiliateAccessEvent("affiliate_insert_failed", {
      userId,
      normalizedEmail,
      applicationId: application.id,
      applicationStatus: application.status,
      existingAffiliateStatus: existingAffiliate?.status ?? null,
      errorCode: insertError.code ?? null,
      errorMessage: insertError.message ?? null,
    });
  }

  if (insertError && isAuthUserLinkInsertError(insertError)) {
    const { data: emailOnlyAffiliate, error: emailOnlyInsertError } = await admin
      .from("affiliates")
      .insert(affiliateInsertPayload)
      .select(AFFILIATE_SELECT)
      .single();

    if (emailOnlyInsertError) {
      logAffiliateAccessEvent("affiliate_email_only_insert_failed", {
        userId,
        normalizedEmail,
        applicationId: application.id,
        applicationStatus: application.status,
        existingAffiliateStatus: existingAffiliate?.status ?? null,
        errorCode: emailOnlyInsertError.code ?? null,
        errorMessage: emailOnlyInsertError.message ?? null,
      });
      return { affiliate: existingAffiliate ?? null, blocked: false };
    }

    if (emailOnlyAffiliate) {
      logAffiliateAccessEvent("affiliate_email_only_insert_succeeded", {
        userId,
        normalizedEmail,
        applicationId: application.id,
        applicationStatus: application.status,
        existingAffiliateStatus: existingAffiliate?.status ?? null,
      });
      return { affiliate: mapAffiliateRow(emailOnlyAffiliate as AffiliateRow), blocked: false };
    }
  }

  if (insertError || !insertedAffiliate) {
    logAffiliateAccessEvent("affiliate_insert_unusable", {
      userId,
      normalizedEmail,
      applicationId: application.id,
      applicationStatus: application.status,
      existingAffiliateStatus: existingAffiliate?.status ?? null,
      errorCode: insertError?.code ?? null,
      errorMessage: insertError?.message ?? null,
      redirectBranch: "insert_failed_no_affiliate",
    });
    return { affiliate: existingAffiliate ?? null, blocked: false };
  }

  logAffiliateAccessEvent("affiliate_insert_succeeded", {
    userId,
    normalizedEmail,
    applicationId: application.id,
    applicationStatus: application.status,
    existingAffiliateStatus: existingAffiliate?.status ?? null,
  });

  return { affiliate: mapAffiliateRow(insertedAffiliate as AffiliateRow), blocked: false };
}

export async function getAffiliatePayoutSummary(affiliateId: string) {
  const supabase = await supabaseServer();

  const pendingPromise = supabase
    .from("affiliate_payout_items")
    .select("amount_usd")
    .eq("affiliate_id", affiliateId)
    .in("status", ["pending", "scheduled"]);

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

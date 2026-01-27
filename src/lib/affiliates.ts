import { supabaseServer } from "@/lib/supabase-server";

export type AffiliateSummary = {
  id: string;
  displayName: string;
  email: string;
  payoutEmail: string | null;
  slug: string;
  referralCode: string | null;
  commissionRate: number;
  status: string;
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

export async function getAffiliateForUser(userId: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("affiliates")
    .select("id, display_name, email, payout_email, slug, referral_code, commission_rate, status")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    displayName: data.display_name,
    email: data.email,
    payoutEmail: data.payout_email ?? null,
    slug: data.slug,
    referralCode: data.referral_code ?? null,
    commissionRate: Number(data.commission_rate ?? 0),
    status: data.status,
  } satisfies AffiliateSummary;
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

  return (data ?? []) as AffiliatePayoutItemRow[];
}

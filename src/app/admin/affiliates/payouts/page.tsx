import { Card } from "@pixiedvc/design-system";

import { requireAdminUser } from "@/lib/admin";
import AdminAffiliatePayoutsClient, {
  type AffiliateOption,
  type PayoutItemRow,
  type PayoutRunRow,
} from "@/app/admin/affiliates/payouts/AdminAffiliatePayoutsClient";

export default async function AdminAffiliatePayoutsPage() {
  const { supabase } = await requireAdminUser("/admin/affiliates/payouts");

  const { data: affiliates } = await supabase
    .from("affiliates")
    .select("id, display_name, email, payout_email, referral_code, slug, commission_rate")
    .order("display_name", { ascending: true });

  const { data: payoutRuns } = await supabase
    .from("affiliate_payout_runs")
    .select("id, period_start, period_end, status, notes, created_at, paid_at")
    .order("created_at", { ascending: false });

  const { data: payoutItems } = await supabase
    .from("affiliate_payout_items")
    .select("id, payout_run_id, affiliate_id, amount_usd, booking_count, booking_request_ids, status, paid_at, payout_reference, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Admin</p>
        <h1 className="font-display text-3xl text-ink">Affiliate payouts</h1>
        <p className="text-sm text-muted">Generate manual payout runs, export CSVs, and mark payments.</p>
      </header>

      <Card>
        <AdminAffiliatePayoutsClient
          affiliates={(affiliates ?? []) as AffiliateOption[]}
          payoutRuns={(payoutRuns ?? []) as PayoutRunRow[]}
          payoutItems={(payoutItems ?? []) as PayoutItemRow[]}
        />
      </Card>
    </div>
  );
}

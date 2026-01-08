import { Card } from "@pixiedvc/design-system";

import { requireAdminUser } from "@/lib/admin";
import AdminPayoutsClient, { type AffiliateOption, type PayoutRow } from "@/app/admin/payouts/AdminPayoutsClient";

export default async function AdminPayoutsPage() {
  const { supabase } = await requireAdminUser("/admin/payouts");

  const { data: affiliates } = await supabase
    .from("affiliates")
    .select("id, display_name, email")
    .order("display_name", { ascending: true });

  const { data: payouts } = await supabase
    .from("affiliate_payouts")
    .select("id, affiliate_id, period_start, period_end, status, total_amount_usd, paypal_reference, created_at, paid_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Admin</p>
        <h1 className="font-display text-3xl text-ink">Affiliate payouts</h1>
        <p className="text-sm text-muted">Create monthly payouts and track PayPal references.</p>
      </header>

      <Card>
        <AdminPayoutsClient
          affiliates={(affiliates ?? []) as AffiliateOption[]}
          payouts={(payouts ?? []) as PayoutRow[]}
        />
      </Card>
    </div>
  );
}

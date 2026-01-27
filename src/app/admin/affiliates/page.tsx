import { Card } from "@pixiedvc/design-system";

import { requireAdminUser } from "@/lib/admin";
import AdminAffiliatesClient, { type AffiliateRow } from "@/app/admin/affiliates/AdminAffiliatesClient";
import AdminAffiliateConversionsClient, {
  type AffiliateConversionRow,
} from "@/app/admin/affiliates/AdminAffiliateConversionsClient";

export default async function AdminAffiliatesPage() {
  const { supabase } = await requireAdminUser("/admin/affiliates");

  const { data } = await supabase
    .from("affiliates")
    .select("id, display_name, email, slug, referral_code, status, tier, commission_rate, auth_user_id, created_at")
    .order("created_at", { ascending: false });

  const { data: conversions } = await supabase
    .from("affiliate_conversions")
    .select(
      "id, status, booking_amount_usd, commission_rate, commission_amount_usd, confirmed_at, created_at, affiliate:affiliates(display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Admin</p>
        <h1 className="font-display text-3xl text-ink">Affiliate management</h1>
        <p className="text-sm text-muted">Create new affiliates, update tiers, and manage referral slugs.</p>
      </header>

      <Card>
        <AdminAffiliatesClient affiliates={(data ?? []) as AffiliateRow[]} />
      </Card>

      <Card>
        <AdminAffiliateConversionsClient conversions={(conversions ?? []) as AffiliateConversionRow[]} />
      </Card>
    </div>
  );
}

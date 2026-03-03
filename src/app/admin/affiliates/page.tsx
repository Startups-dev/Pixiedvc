import { Card } from "@pixiedvc/design-system";
import Link from "next/link";

import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import AdminAffiliatesClient, { type AffiliateRow } from "@/app/admin/affiliates/AdminAffiliatesClient";
import AdminAffiliateConversionsClient, {
  type AffiliateConversionRow,
} from "@/app/admin/affiliates/AdminAffiliateConversionsClient";

export default async function AdminAffiliatesPage() {
  await requireAdminUser("/admin/affiliates");
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return (
      <main className="min-h-screen bg-[#212121] text-[#ececec]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="rounded-2xl border border-rose-500/30 bg-rose-900/20 p-4 text-sm text-rose-200">
            Admin client is not configured. Set <code>SUPABASE_SERVICE_ROLE_KEY</code> to access affiliate admin data.
          </p>
        </div>
      </main>
    );
  }

  const { data } = await supabase
    .from("affiliates")
    .select(
      "id, display_name, email, website, social_links, promotion_description, traffic_estimate, status, tier, slug, referral_code, commission_rate, auth_user_id, suspend_reason, review_notes, reviewed_at, created_at",
    )
    .order("created_at", { ascending: false });

  const { data: conversions } = await supabase
    .from("affiliate_conversions")
    .select(
      "id, status, booking_amount_usd, commission_rate, commission_amount_usd, confirmed_at, created_at, affiliate:affiliates(display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const { count: pendingApplicationsCount } = await supabase
    .from("affiliate_applications")
    .select("id", { head: true, count: "exact" })
    .eq("status", "pending");

  return (
    <main className="min-h-screen bg-[#212121] text-[#ececec]">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
        <header className="space-y-3">
          <a href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            Admin
          </a>
          <h1 className="font-display text-3xl" style={{ color: "#64748b" }}>
            Affiliate management
          </h1>
          <p className="text-sm text-[#b4b4b4]">
            Create new affiliates, update tiers, and manage referral slugs.
          </p>
          <Link
            href="/admin/affiliates/applications"
            className="inline-flex items-center gap-2 rounded-full border border-[#3a3a3a] bg-[#212121] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b4b4b4] hover:bg-[#171717] hover:text-[#ececec]"
          >
            Review Applications
            <span className="rounded-full border border-[#3a3a3a] bg-[#2a2a2a] px-2 py-0.5 text-[10px] text-[#ececec]">
              {pendingApplicationsCount ?? 0}
            </span>
          </Link>
        </header>

        <Card surface="dark" className="border border-[#3a3a3a] bg-[#2f2f2f]">
          <AdminAffiliatesClient affiliates={(data ?? []) as AffiliateRow[]} />
        </Card>

        <Card surface="dark" className="border border-[#3a3a3a] bg-[#2f2f2f]">
          <AdminAffiliateConversionsClient conversions={(conversions ?? []) as AffiliateConversionRow[]} />
        </Card>
      </div>
    </main>
  );
}

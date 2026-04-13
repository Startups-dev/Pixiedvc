import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import AdminSubnav from "@/app/admin/AdminSubnav";
import AdminLiquidationOpportunitiesClient from "@/app/admin/liquidation-opportunities/AdminLiquidationOpportunitiesClient";

type Row = {
  id: string;
  status: string;
  points_available: number;
  expiration_date: string;
  urgency_level: "not_urgent" | "moderate" | "urgent";
  target_price_per_point_cents: number | null;
  flexibility_notes: string | null;
  newsletter_opt_in: boolean;
  featured_in_newsletter: boolean;
  admin_approved: boolean;
  public_visibility: boolean;
  admin_notes: string | null;
  created_at: string;
  home_resort?: { name?: string | null } | null;
  owner_profile?: { email?: string | null; display_name?: string | null } | null;
};

export default async function AdminLiquidationOpportunitiesPage() {
  await requireAdminUser("/admin/liquidation-opportunities");
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
          <AdminSubnav current="liquidation-opportunities" />
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Missing service role key. Configure <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </Card>
        </div>
      </div>
    );
  }

  const { data, error } = await admin
    .from("point_liquidation_requests")
    .select(
      "id, status, points_available, expiration_date, urgency_level, target_price_per_point_cents, flexibility_notes, newsletter_opt_in, featured_in_newsletter, admin_approved, public_visibility, admin_notes, created_at, home_resort:resorts(name), owner_profile:profiles(email, display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(400);

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
        <AdminSubnav current="liquidation-opportunities" />
        <header className="space-y-2">
          <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            ← Back to admin
          </Link>
          <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>
            Last-Minute Liquidation Opportunities
          </h1>
          <p className="text-sm text-[#b4b4b4]">
            Review owner liquidation submissions for expiring points and short-notice opportunities.
          </p>
        </header>

        {error ? (
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6">
            <p className="text-sm text-[#ff6b6b]">Unable to load liquidation opportunities.</p>
            <p className="mt-2 text-xs text-[#8e8ea0]">{error.message}</p>
          </Card>
        ) : (
          <AdminLiquidationOpportunitiesClient rows={(data ?? []) as Row[]} />
        )}
      </div>
    </div>
  );
}

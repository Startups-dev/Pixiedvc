import { Card } from "@pixiedvc/design-system";
import Link from "next/link";

import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import AdminAffiliateApplicationsClient, {
  type AffiliateApplicationRow,
} from "@/app/admin/affiliates/applications/AdminAffiliateApplicationsClient";

export const dynamic = "force-dynamic";

export default async function AdminAffiliateApplicationsPage() {
  await requireAdminUser("/admin/affiliates/applications");
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return (
      <main className="min-h-screen bg-[#212121] text-[#ececec]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="rounded-2xl border border-rose-500/30 bg-rose-900/20 p-4 text-sm text-rose-200">
            Admin client is not configured. Set <code>SUPABASE_SERVICE_ROLE_KEY</code> to access affiliate applications.
          </p>
        </div>
      </main>
    );
  }

  const { data } = await supabase
    .from("affiliate_applications")
    .select(
      "id, display_name, email, website, social_links, traffic_estimate, promotion_description, status, admin_notes, created_at, approved_at, rejected_at",
    )
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#212121] text-[#ececec]">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
        <header className="space-y-2">
          <a href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            Admin
          </a>
          <h1 className="font-display text-3xl" style={{ color: "#64748b" }}>
            Affiliate applications
          </h1>
          <p className="text-sm text-[#b4b4b4]">
            Review inbound affiliate applicants and approve into the affiliate program.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/affiliates"
              className="inline-flex rounded-full border border-[#3a3a3a] bg-[#212121] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b4b4b4] hover:bg-[#171717] hover:text-[#ececec]"
            >
              Back to Affiliates
            </Link>
          </div>
        </header>

        <Card surface="dark" className="border border-[#3a3a3a] bg-[#2f2f2f]">
          <AdminAffiliateApplicationsClient applications={(data ?? []) as AffiliateApplicationRow[]} />
        </Card>
      </div>
    </main>
  );
}

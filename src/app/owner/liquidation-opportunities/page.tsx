import Link from "next/link";

import { Card, Button } from "@pixiedvc/design-system";
import { requireOwnerAccess } from "@/lib/owner/requireOwnerAccess";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import OwnerLiquidationOpportunityForm from "@/components/owner/OwnerLiquidationOpportunityForm";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default async function OwnerLiquidationOpportunitiesPage() {
  const { user, owner } = await requireOwnerAccess("/owner/liquidation-opportunities");
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-rose-600">Admin service is unavailable. Try again later.</p>
        </Card>
      </main>
    );
  }

  const ownerIds = Array.from(
    new Set(
      [user.id, owner.id ?? null, owner.user_id ?? null].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      ),
    ),
  );

  const [{ data: resorts }, { data: rows }] = await Promise.all([
    admin.from("resorts").select("id, name").order("name", { ascending: true }),
    admin
      .from("point_liquidation_requests")
      .select(
        "id, points_available, expiration_date, travel_window_start, travel_window_end, target_price_per_point_cents, newsletter_opt_in, featured_in_newsletter, admin_approved, status, created_at, home_resort:resorts(name)",
      )
      .in("owner_user_id", ownerIds)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Owner opportunities</p>
        <h1 className="text-3xl font-semibold text-ink">Last-Minute Liquidation Opportunities</h1>
        <p className="max-w-3xl text-sm text-muted">
          This flow is for expiring points and short-notice opportunities, not standard Ready Stays. PixieDVC reviews each submission, helps match the right guest, and can optionally feature approved opportunities in curated newsletter placements. This is concierge-assisted and not an instant public listing.
        </p>
        <div>
          <Button asChild variant="ghost">
            <Link href="/owner/ready-stays">Back to Ready Stays</Link>
          </Button>
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Submit a last-minute deal</h2>
        <p className="mt-2 text-sm text-muted">
          Submit your details and target pricing guidance, and we will review, prioritize, and route the opportunity through concierge-assisted matching.
        </p>
        <div className="mt-5">
          <OwnerLiquidationOpportunityForm resorts={(resorts ?? []) as Array<{ id: string; name: string }>} />
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Your submissions</h2>
        {rows?.length ? (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Resort</th>
                  <th className="px-4 py-3 text-left font-semibold">Points</th>
                  <th className="px-4 py-3 text-left font-semibold">Expiration</th>
                  <th className="px-4 py-3 text-left font-semibold">Target</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Newsletter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(rows as Array<Record<string, unknown>>).map((row) => (
                  <tr key={String(row.id)}>
                    <td className="px-4 py-3 text-ink">
                      {typeof (row.home_resort as { name?: string } | null)?.name === "string"
                        ? (row.home_resort as { name: string }).name
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{Number(row.points_available ?? 0)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate((row.expiration_date as string) ?? null)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.target_price_per_point_cents
                        ? `$${(Number(row.target_price_per_point_cents) / 100).toFixed(2)}/pt`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{String(row.status ?? "pending_review")}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.featured_in_newsletter ? "Featured" : row.newsletter_opt_in ? "Opted in" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No submissions yet.</p>
        )}
      </Card>
    </main>
  );
}

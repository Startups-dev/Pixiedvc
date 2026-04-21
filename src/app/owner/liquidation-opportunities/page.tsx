import { Card } from "@pixiedvc/design-system";
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
      <main className="min-h-screen bg-background-primary">
        <div className="mx-auto max-w-5xl space-y-6 px-6 py-14">
          <Card className="!rounded-2xl !border-border-subtle !bg-background-secondary p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_40px_rgba(0,0,0,0.3)]">
            <p className="text-sm text-slate-300">Admin service is unavailable. Try again later.</p>
          </Card>
        </div>
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
    <main className="min-h-screen bg-background-primary">
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-14">
        <Card className="!rounded-2xl !border-border-subtle !bg-background-secondary p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_40px_rgba(0,0,0,0.3)]">
          <header className="space-y-4">
            <h1 className="text-3xl font-semibold text-white md:text-4xl" style={{ color: "#ffffff" }}>
              Soon to expire points?
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
              We&apos;ll help you move them fast.
              <br />
              <br />
              If your points are expiring soon, our concierge team will price and promote them to active guest demand through our curated newsletter.
            </p>
          </header>
        </Card>

        <Card className="liquidation-submit-panel !rounded-[22px] p-7 md:p-8">
          <h2 className="text-[19px] font-semibold uppercase leading-tight tracking-[0.24em] text-white" style={{ color: "#ffffff" }}>
            Submit your points for review
          </h2>
          <p className="mt-3 max-w-4xl border-b border-[#7184a3]/20 pb-5 text-[15px] leading-6 text-[#b7c3d4]">
            Share your points, timing, and pricing target, and our team will review and prioritize the best matching path.
          </p>
          <div className="mt-5">
            <OwnerLiquidationOpportunityForm resorts={(resorts ?? []) as Array<{ id: string; name: string }>} />
          </div>
        </Card>

        <Card className="!rounded-2xl !border-border-subtle !bg-background-secondary p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_40px_rgba(0,0,0,0.3)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white" style={{ color: "#ffffff" }}>
            Your submissions
          </h2>
          {rows?.length ? (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border-subtle">
              <table className="min-w-full divide-y divide-border-subtle text-sm">
                <thead className="bg-background-tertiary text-xs uppercase tracking-[0.2em] text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Resort</th>
                    <th className="px-4 py-3 text-left font-semibold">Points</th>
                    <th className="px-4 py-3 text-left font-semibold">Expiration</th>
                    <th className="px-4 py-3 text-left font-semibold">Target</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Newsletter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {(rows as Array<Record<string, unknown>>).map((row) => (
                    <tr key={String(row.id)}>
                      <td className="px-4 py-3 text-slate-300">
                        {typeof (row.home_resort as { name?: string } | null)?.name === "string"
                          ? (row.home_resort as { name: string }).name
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{Number(row.points_available ?? 0)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate((row.expiration_date as string) ?? null)}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {row.target_price_per_point_cents
                          ? `$${(Number(row.target_price_per_point_cents) / 100).toFixed(2)}/pt`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{String(row.status ?? "pending_review")}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {row.featured_in_newsletter ? "Featured" : row.newsletter_opt_in ? "Opted in" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-300">No submissions yet.</p>
          )}
        </Card>
      </div>
    </main>
  );
}

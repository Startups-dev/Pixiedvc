import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOwnerPayouts } from "@/lib/owner-data";
import { formatCurrency } from "@/lib/owner-portal";

export default async function OwnerPayoutsPage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/payouts");
  }

  const payouts = await getOwnerPayouts(user.id, cookieStore);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <Link href="/owner/dashboard" className="text-xs uppercase tracking-[0.3em] text-muted">
          ← Back to dashboard
        </Link>
        <h1 className="text-3xl font-semibold text-ink">Payouts</h1>
        <p className="text-sm text-muted">Track eligible and released payments per rental.</p>
      </header>

      <Card>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted">No payouts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-2 py-3">Rental</th>
                  <th className="px-2 py-3">Stage</th>
                  <th className="px-2 py-3">Amount</th>
                  <th className="px-2 py-3">Eligible</th>
                  <th className="px-2 py-3">Released</th>
                  <th className="px-2 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-slate-100">
                    <td className="px-2 py-3 text-xs text-slate-500">{payout.rental_id.slice(0, 8)}</td>
                    <td className="px-2 py-3">{payout.stage === 70 ? "Stage 1" : "Stage 2"}</td>
                    <td className="px-2 py-3 font-semibold text-ink">{formatCurrency(payout.amount_cents)}</td>
                    <td className="px-2 py-3">
                      {payout.eligible_at ? new Date(payout.eligible_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-2 py-3">
                      {payout.released_at ? new Date(payout.released_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-2 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                        {payout.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

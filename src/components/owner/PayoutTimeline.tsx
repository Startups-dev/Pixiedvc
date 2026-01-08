import { Card } from "@pixiedvc/design-system";
import type { PayoutLedgerRow } from "@/lib/owner-data";
import { formatCurrency } from "@/lib/owner-portal";

const statusColors: Record<string, string> = {
  released: "text-emerald-700",
  eligible: "text-indigo-600",
  pending: "text-slate-500",
  failed: "text-rose-600",
};

function renderStageLabel(stage: number) {
  return stage === 70 ? "Stage 1 · 70%" : "Stage 2 · 30%";
}

export default function PayoutTimeline({ payouts }: { payouts: PayoutLedgerRow[] }) {
  const sorted = [...payouts].sort((a, b) => Number(a.stage) - Number(b.stage));

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Payout timeline</p>
        <h2 className="text-xl font-semibold text-ink">Release schedule</h2>
      </div>
      {sorted.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">Payout stages will appear once milestones are completed.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((payout) => (
            <div key={payout.id} className="rounded-2xl border border-slate-100 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{renderStageLabel(payout.stage)}</p>
                  <p className="text-xs text-muted">
                    Eligible {payout.eligible_at ? new Date(payout.eligible_at).toLocaleDateString() : "Pending"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-ink">{formatCurrency(payout.amount_cents)}</p>
                  <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${statusColors[payout.status] ?? "text-muted"}`}>
                    {payout.status}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

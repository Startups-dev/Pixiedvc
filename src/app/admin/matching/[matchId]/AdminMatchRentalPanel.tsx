import CopyButton from './CopyButton';

function renderField(label: string, value: string | number | null | undefined, copyValue?: string | null) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-2 font-medium text-slate-900">
        <span>{value ?? '—'}</span>
        {copyValue ? <CopyButton value={copyValue} /> : null}
      </span>
    </div>
  );
}

export default function AdminMatchRentalPanel({
  rental,
  milestones,
  payouts,
}: {
  rental: {
    id: string | null;
    status: string | null;
    check_in: string | null;
    check_out: string | null;
    dvc_confirmation_number: string | null;
  } | null;
  milestones: Array<{ code: string | null; status: string | null; occurred_at: string | null }>;
  payouts: Array<{
    stage: number | null;
    amount_cents: number | null;
    status: string | null;
    eligible_at: string | null;
    released_at: string | null;
  }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rental</p>
          {renderField('Rental ID', rental?.id ?? null, rental?.id ?? null)}
          {renderField('Status', rental?.status ?? null)}
          {renderField('Check-in', rental?.check_in ?? null)}
          {renderField('Check-out', rental?.check_out ?? null)}
          {renderField('DVC confirmation', rental?.dvc_confirmation_number ?? null)}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Milestones</p>
          {milestones.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No milestones.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {milestones.map((milestone) => (
                <li key={`${milestone.code ?? 'milestone'}-${milestone.occurred_at ?? 'pending'}`}>
                  {milestone.code ?? '—'} · {milestone.status ?? '—'}
                  {milestone.occurred_at ? ` · ${milestone.occurred_at}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Payout ledger</p>
          {payouts.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No payouts.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {payouts.map((payout) => (
                <li key={`${payout.stage ?? 0}-${payout.status ?? 'pending'}`}>
                  Stage {payout.stage ?? '—'} · {payout.status ?? '—'} · {payout.amount_cents ?? 0}
                  {payout.released_at ? ` · released ${payout.released_at}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

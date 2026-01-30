import type { ContractSnapshot } from '@/lib/contracts/contractSnapshot';
import { renderPixieAgreementHTML } from '@/lib/agreements/renderPixieAgreement';

export default function AgreementPreview({ contract }: { contract: any }) {
  const snapshot = (contract?.snapshot ?? null) as ContractSnapshot | null;
  const renderedHtml =
    snapshot?.templateVersion?.startsWith('pixie_dvc_v1')
      ? renderPixieAgreementHTML(snapshot, {
          guestAcceptedAt: contract?.guest_accepted_at ?? null,
          acceptanceId: contract?.id ?? null,
        })
      : null;

  const locked =
    contract?.status === 'accepted' ||
    Boolean(contract?.guest_accepted_at) ||
    Boolean(contract?.owner_accepted_at);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">Agreement</div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
            locked ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {locked ? 'Locked' : 'Draft'}
        </span>
      </div>
      {snapshot?.templateVersion ? (
        <div className="mb-2 text-xs text-slate-500">Template: {snapshot.templateVersion}</div>
      ) : null}
      {renderedHtml ? (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <p className="text-sm text-slate-600">Agreement preview unavailable.</p>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';

import type { ContractSnapshot } from '@/lib/contracts/contractSnapshot';
import { renderPixieAgreementHTML } from '@/lib/agreements/renderPixieAgreement';

type Props = {
  contract: {
    id: number;
    contract_body?: string | null;
    status: string;
    guest_accepted_at?: string | null;
    snapshot?: ContractSnapshot | null;
  };
  snapshot?: ContractSnapshot | null;
};

export default function ContractPreview({ contract, snapshot }: Props) {
  const [copied, setCopied] = useState(false);

  const resolvedSnapshot = (snapshot ?? contract.snapshot ?? null) as ContractSnapshot | null;
  const renderedHtml =
    resolvedSnapshot?.templateVersion?.startsWith('pixie_dvc_v1')
      ? renderPixieAgreementHTML(resolvedSnapshot, {
          guestAcceptedAt: contract.guest_accepted_at ?? null,
          acceptanceId: contract.id ?? null,
        })
      : null;
  const rawBody = contract.contract_body ?? '';

  const copy = async () => {
    if (!rawBody) return;
    await navigator.clipboard.writeText(rawBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Agreement Preview</h2>
            <p className="text-xs text-slate-500">
              Template: {resolvedSnapshot?.templateVersion ?? 'pixie_dvc_v1'} · Status: {contract.status}
            </p>
          </div>
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
              contract.status === 'accepted'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {contract.status === 'accepted' ? 'Locked' : 'Draft'}
          </span>
        </div>
        {renderedHtml ? (
          <div
            className="prose prose-sm mt-4 max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <p className="mt-4 text-sm text-slate-500">Rendered preview unavailable.</p>
        )}
      </div>

      <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">Raw contract_body</summary>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Stored text for auditing/debug. Use Copy to export.
          </p>
          <button
            type="button"
            onClick={copy}
            disabled={!rawBody}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ${
              rawBody ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            {copied ? 'Copied!' : 'Copy text'}
          </button>
        </div>
        <pre className="mt-3 max-h-[400px] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-800">
          {rawBody || '—'}
        </pre>
      </details>
    </div>
  );
}

'use client';

import { useState } from 'react';

type Props = {
  contract: {
    id: number;
    contract_body: string;
    status: string;
    template_name: string;
  };
};

export default function ContractPreview({ contract }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(contract.contract_body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Contract Preview</h2>
          <p className="text-xs text-slate-500">
            Template: {contract.template_name} · Status: {contract.status}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
        >
          {copied ? 'Copied!' : 'Copy text'}
        </button>
      </div>
      <pre className="mt-4 max-h-[400px] whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-800 overflow-auto">
        {contract.contract_body}
      </pre>
    </div>
  );
}

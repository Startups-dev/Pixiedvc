'use client';

import { useState } from 'react';

type ReceiptCopyFieldProps = {
  label: string;
  value?: string | null;
};

export default function ReceiptCopyField({ label, value }: ReceiptCopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const canCopy = Boolean(value);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[0.65rem] uppercase tracking-[0.22em] text-[#0B1B3A]/55">
        {label}
      </div>

      <button
        type="button"
        onClick={handleCopy}
        disabled={!canCopy}
        aria-label={canCopy ? `Copy ${label}` : `${label} pending`}
        className="font-mono text-sm font-semibold tracking-[0.08em] text-[#0B1B3A] transition hover:text-[#0B1B3A]/85 disabled:cursor-not-allowed disabled:text-[#0B1B3A]/40"
      >
        {value ?? 'Pending'}
      </button>

      <div className="h-4 text-[0.6rem] uppercase tracking-[0.2em] text-[#0B1B3A]/50">
        {copied ? 'Copied' : ''}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

type Props = {
  value: string | null | undefined;
};

export default function CopyButton({ value }: Props) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

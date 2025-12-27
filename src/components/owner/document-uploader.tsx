'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const KIND_OPTIONS = [
  { value: 'member_card', label: 'DVC Member Card' },
  { value: 'id', label: 'Government ID' },
  { value: 'contract', label: 'Contract' },
];

export default function OwnerDocumentUploader() {
  const router = useRouter();
  const [kind, setKind] = useState('member_card');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!file) {
      setError('Select a document to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);

    setSubmitting(true);
    const response = await fetch('/api/owner/documents/upload', {
      method: 'POST',
      body: formData,
    });
    setSubmitting(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? 'Upload failed');
      return;
    }

    setFile(null);
    setMessage('Document uploaded.');
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700">Document type</label>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          >
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700">Upload file</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <p className="text-xs text-slate-500">Upload redacted versions only. Supported: images or PDF.</p>
        </div>

        <button
          type="submit"
          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? 'Uploading…' : 'Upload document'}
        </button>
      </form>

      {message ? <p className="mt-2 text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

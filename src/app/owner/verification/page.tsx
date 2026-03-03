'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase';

type ProofFile = {
  path: string;
  name: string;
  size: number;
};

type VerificationRow = {
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  review_notes: string | null;
  proof_files: ProofFile[];
};

export default function OwnerVerificationPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<VerificationRow | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login?redirect=/owner/verification');
        return;
      }
      setUserId(data.user.id);
      supabase
        .from('owner_verifications')
        .select('status, submitted_at, approved_at, rejected_at, review_notes, proof_files')
        .eq('owner_id', data.user.id)
        .maybeSingle()
        .then(({ data: row }) => {
          if (row) {
            setStatus(row as VerificationRow);
          } else {
            setStatus({
              status: 'not_started',
              submitted_at: null,
              approved_at: null,
              rejected_at: null,
              review_notes: null,
              proof_files: [],
            });
          }
        });
    });
  }, [router, supabase]);

  const statusLabel =
    status?.status === 'approved'
      ? 'Approved'
      : status?.status === 'submitted'
        ? 'Submitted'
        : status?.status === 'rejected'
          ? 'Rejected'
          : 'Not started';

  async function handleSubmit() {
    if (!userId) return;
    setSubmitting(true);
    setMessage(null);

    const uploaded: ProofFile[] = [];
    for (const file of files) {
      const startResponse = await fetch('/api/owner/verification/start-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          doc_type: 'verification_proof',
          mime_type: file.type,
          size_bytes: file.size,
        }),
      });

      if (!startResponse.ok) {
        setSubmitting(false);
        setMessage('Unable to upload verification files.');
        return;
      }

      const startPayload = (await startResponse.json()) as {
        object_path: string;
        signed_url: string;
      };

      const uploadResponse = await fetch(startPayload.signed_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'false',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        setSubmitting(false);
        setMessage('Unable to upload verification files.');
        return;
      }

      const finalizeResponse = await fetch('/api/owner/verification/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          object_path: startPayload.object_path,
          doc_type: 'verification_proof',
          original_name: file.name,
          size_bytes: file.size,
        }),
      });

      if (!finalizeResponse.ok) {
        setSubmitting(false);
        setMessage('Unable to submit verification.');
        return;
      }

      uploaded.push({ path: startPayload.object_path, name: file.name, size: file.size });

      const finalizePayload = (await finalizeResponse.json()) as { verification?: VerificationRow };
      if (finalizePayload.verification) {
        setStatus(finalizePayload.verification);
      }
    }

    setStatus((prev) => {
      const mergedProofs = [
        ...(prev?.proof_files ?? []),
        ...uploaded.filter((nextFile) => !(prev?.proof_files ?? []).some((existing) => existing.path === nextFile.path)),
      ];
      if (prev) {
        return {
          ...prev,
          status: 'submitted',
          submitted_at: prev.submitted_at ?? new Date().toISOString(),
          proof_files: mergedProofs,
        };
      }
      return {
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        approved_at: null,
        rejected_at: null,
        review_notes: null,
        proof_files: mergedProofs,
      };
    });
    setFiles([]);
    setSubmitting(false);
    setMessage('Verification submitted.');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Owner verification</p>
        <h1 className="text-3xl font-semibold text-slate-900">Submit verification</h1>
        <p className="mt-2 text-sm text-slate-500">
          Upload any supporting proof (membership screenshot, contract page, or recent statement).
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {statusLabel}
          </span>
          {status?.review_notes ? (
            <span className="text-sm text-rose-600">Review notes: {status.review_notes}</span>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          <label className="text-sm font-semibold text-slate-700">Verification files</label>
          <input
            type="file"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
          {status?.proof_files?.length ? (
            <div className="space-y-2 text-xs text-slate-500">
              {status.proof_files.map((file) => (
                <div key={file.path} className="rounded-xl border border-slate-100 px-3 py-2">
                  {file.name}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={submitting || files.length === 0}
          >
            {submitting ? 'Submitting…' : 'Submit verification'}
          </button>
          {message ? <p className="text-sm text-slate-500">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}

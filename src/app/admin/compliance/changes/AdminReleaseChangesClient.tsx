'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type ReleaseRow = {
  id: string;
  environment: string;
  release_version: string | null;
  description: string;
  deployed_by: string;
  approved_by: string;
  deployed_at: string;
  rollback_available: boolean | null;
  notes: string | null;
};

type Props = {
  initialRows: ReleaseRow[];
  defaultReleaseVersion: string | null;
  defaultEmail: string | null;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US');
}

function toDateTimeLocal(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AdminReleaseChangesClient({
  initialRows,
  defaultReleaseVersion,
  defaultEmail,
}: Props) {
  const router = useRouter();
  const [rows] = useState(initialRows);
  const [environment, setEnvironment] = useState('production');
  const [releaseVersion, setReleaseVersion] = useState(defaultReleaseVersion ?? '');
  const [description, setDescription] = useState('');
  const [deployedBy, setDeployedBy] = useState(defaultEmail ?? '');
  const [approvedBy, setApprovedBy] = useState(defaultEmail ?? '');
  const [deployedAt, setDeployedAt] = useState(toDateTimeLocal(new Date()));
  const [rollbackAvailable, setRollbackAvailable] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => (a.deployed_at < b.deployed_at ? 1 : -1));
  }, [rows]);

  async function submitRelease() {
    setMessage(null);
    if (!description.trim()) {
      setMessage('Description is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/compliance/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment,
          release_version: releaseVersion.trim() || null,
          description: description.trim(),
          deployed_by: deployedBy.trim(),
          approved_by: approvedBy.trim(),
          deployed_at: new Date(deployedAt).toISOString(),
          rollback_available: rollbackAvailable,
          notes: notes.trim() || null,
        }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(payload.error ?? 'Failed to record release.');
        return;
      }
      setDescription('');
      setNotes('');
      setMessage('Release recorded.');
      router.refresh();
    } catch {
      setMessage('Failed to record release.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Release log</p>
            <h2 className="text-xl font-semibold text-slate-900">Record Release</h2>
          </div>
          <button
            type="button"
            onClick={submitRelease}
            disabled={submitting}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Record Release'}
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Environment
            <select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Release version
            <input
              value={releaseVersion}
              onChange={(event) => setReleaseVersion(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Git tag or commit"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400 md:col-span-2">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              placeholder="What changed in this release?"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Deployed by
            <input
              value={deployedBy}
              onChange={(event) => setDeployedBy(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Approved by
            <input
              value={approvedBy}
              onChange={(event) => setApprovedBy(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Deployed at
            <input
              type="datetime-local"
              value={deployedAt}
              onChange={(event) => setDeployedAt(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            <input
              type="checkbox"
              checked={rollbackAvailable}
              onChange={(event) => setRollbackAvailable(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Rollback available
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400 md:col-span-2">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              rows={2}
            />
          </label>
        </div>
        {message ? (
          <p className="mt-3 text-xs text-slate-500">{message}</p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recent releases</p>
            <h2 className="text-xl font-semibold text-slate-900">Release history</h2>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Deployed at</th>
                <th className="px-4 py-3">Environment</th>
                <th className="px-4 py-3">Release</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Deployed by</th>
                <th className="px-4 py-3">Approved by</th>
                <th className="px-4 py-3">Rollback</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length ? (
                sortedRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {formatDateTime(row.deployed_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.environment}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.release_version ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{row.description}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{row.deployed_by}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{row.approved_by}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.rollback_available ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No release records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

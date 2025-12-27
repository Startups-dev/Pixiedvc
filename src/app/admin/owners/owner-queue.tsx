'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { QueueOwnerDocument, QueueOwnerRecord } from './types';

const statusLabels: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Pending', tone: 'bg-amber-100 text-amber-900 border border-amber-200' },
  needs_more_info: { label: 'Needs info', tone: 'bg-sky-100 text-sky-900 border border-sky-200' },
  verified: { label: 'Verified', tone: 'bg-emerald-100 text-emerald-900 border border-emerald-200' },
  rejected: { label: 'Rejected', tone: 'bg-rose-100 text-rose-900 border border-rose-200' },
  default: { label: 'Unverified', tone: 'bg-slate-100 text-slate-700 border border-slate-200' },
};

type Props = {
  owners: QueueOwnerRecord[];
  statusFilter: string;
};

export default function OwnerQueue({ owners, statusFilter }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => owners[0]?.id ?? null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'activity'>('overview');
  const [commentBody, setCommentBody] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [activeDoc, setActiveDoc] = useState<QueueOwnerDocument | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return owners;
    }
    const needle = search.trim().toLowerCase();
    return owners.filter((owner) => {
      const haystack = `${owner.displayName ?? ''} ${owner.email ?? ''} ${owner.id}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [owners, search]);

  const selectedOwner = useMemo(() => {
    if (!selected) {
      return filtered[0];
    }
    return filtered.find((owner) => owner.id === selected) ?? filtered[0];
  }, [filtered, selected]);

  async function handleStatusChange(status: 'verified' | 'needs_more_info' | 'rejected') {
    if (!selectedOwner) {
      return;
    }

    let reason: string | undefined;
    if (status === 'rejected') {
      reason = window.prompt('Enter a reason for rejection (optional):') ?? undefined;
    }
    if (status === 'needs_more_info') {
      reason = window.prompt('What info do we need from the owner? (optional):') ?? undefined;
    }

    setSubmitting(true);
    setActionError(null);
    setActionMessage(null);

    const response = await fetch('/api/admin/owners/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ownerId: selectedOwner.id, status, reason }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionError(payload.error ?? 'Unable to update status');
      return;
    }

    const label =
      status === 'verified'
        ? 'Owner verified'
        : status === 'rejected'
          ? 'Owner rejected'
          : 'Requested more information';
    setActionMessage(label);
    router.refresh();
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commentBody.trim() || !selectedOwner) {
      return;
    }
    setCommentSubmitting(true);
    setActionError(null);

    const response = await fetch('/api/admin/owners/comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ownerId: selectedOwner.id, body: commentBody.trim() }),
    });

    setCommentSubmitting(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionError(payload.error ?? 'Unable to add comment');
      return;
    }

    setCommentBody('');
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
          <h1 className="text-3xl font-semibold text-slate-900">Owner Verification</h1>
          <p className="text-sm text-slate-500">Status filter: {statusFilter === 'all' ? 'All statuses' : statusFilter}</p>
        </div>
        <input
          type="search"
          placeholder="Search by name, email, ID…"
          className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm md:w-72"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Queue ({filtered.length})</h2>
            <Link href="/owner/onboarding" className="text-sm font-semibold text-indigo-600 hover:underline">
              View sample intake
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No owners match this filter.</p>
            ) : (
              filtered.map((owner) => {
                const status = statusLabels[owner.status] ?? statusLabels.default;
                return (
                  <button
                    key={owner.id}
                    onClick={() => setSelected(owner.id)}
                    className={`flex w-full items-start justify-between gap-3 px-3 py-4 text-left transition hover:bg-slate-50 ${
                      selectedOwner?.id === owner.id ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div>
                      <p className="text-base font-semibold text-slate-900">{owner.displayName ?? 'Unnamed owner'}</p>
                      <p className="text-xs text-slate-500">{owner.email ?? 'No email on file'}</p>
                      <p className="text-xs text-slate-400">ID: {owner.id}</p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${status.tone}`}>
                      {status.label}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selectedOwner ? (
            <p className="text-sm text-slate-600">Select an owner to preview documents.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                      activeTab === 'overview' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('documents')}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                      activeTab === 'documents' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Documents
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                      activeTab === 'activity' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Activity
                  </button>
                </div>
              </div>

              {activeTab === 'overview' ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Overview</p>
                    <h2 className="text-2xl font-semibold text-slate-900">{selectedOwner.displayName ?? 'Unnamed owner'}</h2>
                    <p className="text-sm text-slate-500">{selectedOwner.email ?? 'No email on file'}</p>
                    {selectedOwner.submittedAt ? (
                      <p className="text-xs text-slate-400">
                        Submitted {new Date(selectedOwner.submittedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Memberships</h3>
                    {selectedOwner.memberships.length === 0 ? (
                      <p className="text-sm text-slate-500">No contracts linked yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {selectedOwner.memberships.map((membership) => (
                          <li key={membership.id} className="rounded-2xl border border-slate-100 px-3 py-2">
                            <p className="font-medium text-slate-900">{membership.resortName ?? 'Resort TBD'}</p>
                            <p className="text-xs text-slate-500">
                              Use year: {membership.useYear ?? '—'} · Points owned: {membership.pointsOwned ?? '—'} · Available:{' '}
                              {membership.pointsAvailable ?? '—'}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">Actions</h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleStatusChange('verified')}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
                        disabled={submitting}
                      >
                        {submitting ? 'Saving…' : 'Verify'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange('needs_more_info')}
                        className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600 disabled:opacity-60"
                        disabled={submitting}
                      >
                        Needs Info
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange('rejected')}
                        className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-60"
                        disabled={submitting}
                      >
                        Reject
                      </button>
                    </div>
                    {actionMessage ? <p className="text-sm text-emerald-600">{actionMessage}</p> : null}
                    {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
                    {selectedOwner ? (
                      <Link
                        href={`/admin/owners/${selectedOwner.id}`}
                        className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Open workspace →
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {activeTab === 'documents' ? (
                <div className="space-y-3">
                  {selectedOwner.documents.length === 0 ? (
                    <p className="text-sm text-slate-500">No uploads yet.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedOwner.documents.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setActiveDoc(doc)}
                          className="group rounded-2xl border border-slate-200 p-3 text-left shadow-sm transition hover:border-emerald-500"
                        >
                          <div className="aspect-video overflow-hidden rounded-xl bg-slate-100">
                            {doc.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={doc.previewUrl}
                                alt={doc.kind ?? 'Document'}
                                className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-slate-400">No preview</div>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-medium text-slate-900">{formatDocKind(doc.kind)}</p>
                          <p className="text-xs text-slate-500">Uploaded {new Date(doc.createdAt).toLocaleDateString()}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === 'activity' ? (
                <div className="space-y-4">
                  <form onSubmit={handleAddComment} className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Add note</label>
                    <textarea
                      value={commentBody}
                      onChange={(event) => setCommentBody(event.target.value)}
                      className="min-h-[90px] w-full rounded-2xl border border-slate-200 p-3 text-sm"
                      placeholder="Log an internal note for concierge…"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      disabled={commentSubmitting}
                    >
                      {commentSubmitting ? 'Saving…' : 'Post note'}
                    </button>
                  </form>

                  <div className="space-y-3">
                    {selectedOwner.activity.length === 0 ? (
                      <p className="text-sm text-slate-500">No activity yet.</p>
                    ) : (
                      selectedOwner.activity.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-slate-100 p-3 text-sm">
                          <p className="text-xs text-slate-500">
                            {new Date(entry.createdAt).toLocaleString()}
                          </p>
                          {entry.type === 'comment' ? (
                            <p className="mt-1 text-slate-700">{entry.body}</p>
                          ) : (
                            <p className="mt-1 text-slate-700">
                              Status changed {entry.statusTransition?.from ?? '—'} →{' '}
                              <strong>{entry.statusTransition?.to}</strong>
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </div>

      {activeDoc ? <Lightbox doc={activeDoc} onClose={() => setActiveDoc(null)} /> : null}
    </div>
  );
}

function formatDocKind(kind: QueueOwnerDocument['kind']) {
  switch (kind) {
    case 'member_card':
      return 'Member card';
    case 'id':
    case 'id_front':
      return 'Government ID';
    case 'contract':
      return 'Contract';
    default:
      return kind?.replace(/_/g, ' ') || 'Document';
  }
}

function Lightbox({ doc, onClose }: { doc: QueueOwnerDocument; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white p-4 shadow-2xl">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white"
        >
          Close
        </button>
        <div className="aspect-video overflow-hidden rounded-2xl bg-slate-100">
          {doc.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.previewUrl} alt={doc.kind ?? 'Document'} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Preview unavailable</div>
          )}
        </div>
        <div className="mt-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{formatDocKind(doc.kind)}</p>
          <p>Uploaded {new Date(doc.createdAt).toLocaleString()}</p>
        </div>
        <div className="mt-4">
          <Link
            href={doc.previewUrl ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            Open original in new tab
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';

import ContractPreview from '@/components/admin/ContractPreview';
import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import {
  fetchContractEvents,
  fetchContractsForOwner,
  fetchOwnerById,
  fetchOwnerDocuments,
  fetchOwnerMemberships,
  type ContractEventRow,
  type OwnerContractRow,
  type OwnerDocumentRow,
} from '../queries';
import { generateContractAction, markContractStatusAction, sendContractAction } from './actions';
import { TEMPLATE_OPTIONS } from './constants';
import OwnerStatusBanner from './components/OwnerStatusBanner';

type ContractSnapshot = {
  ownerEmail?: string | null;
  guestEmail?: string | null;
};

export default async function AdminOwnerDetailPage({ params }: { params: { id: string } }) {
  const ownerId = params.id;
  await requireAdminUser(`/admin/owners/${ownerId}`);
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return <MissingServiceRole ownerId={ownerId} />;
  }

  const owner = await fetchOwnerById(supabase, ownerId);
  if (!owner) {
    notFound();
  }

  const [memberships, documents, contracts] = await Promise.all([
    fetchOwnerMemberships(supabase, ownerId),
    fetchOwnerDocuments(supabase, ownerId),
    fetchContractsForOwner(supabase, ownerId),
  ]);

  const contractEvents = await fetchContractEvents(
    supabase,
    contracts.map((contract) => contract.id),
  );
  const contractEventsMap = new Map<number, ContractEventRow[]>();
  for (const row of contractEvents) {
    if (!contractEventsMap.has(row.contract_id)) {
      contractEventsMap.set(row.contract_id, []);
    }
    contractEventsMap.get(row.contract_id)?.push(row);
  }

  const totalAvailable = memberships.reduce((sum, membership) => sum + (membership.points_available ?? 0), 0);
  const totalOwned = memberships.reduce((sum, membership) => sum + (membership.points_owned ?? 0), 0);
  const primaryMembership = memberships[0] ?? null;

  const membershipCard = documents.find((doc) => doc.kind === 'member_card') ?? null;
  const govId = documents.find((doc) => doc.kind === 'id') ?? null;
  const ownerEmail = owner.profiles?.email ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin · Owner</p>
          <h1 className="text-3xl font-semibold text-slate-900">{owner.profiles?.display_name ?? owner.profiles?.email ?? 'Owner'}</h1>
          <p className="text-sm text-slate-500">Verification status: {owner.verification ?? 'pending'}</p>
        </div>
        <Link href="/admin/owners" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Back to queue
        </Link>
      </div>

      <OwnerStatusBanner status={owner.verification} rejectionReason={owner.rejection_reason} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Owner details</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-900">{owner.profiles?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Home resort</dt>
              <dd className="text-slate-900">{owner.home_resort ?? primaryMembership?.resort?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Use year</dt>
              <dd className="text-slate-900">{owner.use_year ?? primaryMembership?.use_year ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Points owned</dt>
              <dd className="text-slate-900">{totalOwned.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Points available</dt>
              <dd className="text-slate-900">{totalAvailable.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Documents on file</h2>
          <ul className="mt-3 space-y-3 text-xs">
            <DocumentRow label="DVC Member Card" doc={membershipCard} />
            <DocumentRow label="Government ID" doc={govId} />
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Contract management</h2>
        <form action={generateContractAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="ownerId" value={ownerId} />
          <label className="text-sm font-medium text-slate-700">
            Template
            <select name="templateName" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {TEMPLATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Booking request ID (optional)
            <input
              name="bookingRequestId"
              type="text"
              placeholder="UUID"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Price per point (optional)
            <input
              name="pricePerPoint"
              type="text"
              placeholder="e.g. 24"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm">
              Generate contract
            </button>
          </div>
        </form>

        <ContractsSection
          ownerId={ownerId}
          contracts={contracts as OwnerContractRow[]}
          contractEventsMap={contractEventsMap}
          ownerEmail={ownerEmail}
          sendContractAction={sendContractAction}
          markContractStatusAction={markContractStatusAction}
        />
      </section>
    </div>
  );
}

type DocumentProps = {
  label: string;
  doc: OwnerDocumentRow | null;
};

function DocumentRow({ label, doc }: DocumentProps) {
  return (
    <li className="rounded-lg border border-slate-100 px-4 py-3 text-xs">
      <p className="font-semibold text-slate-900">{label}</p>
      {doc ? (
        <div className="mt-1 flex items-center justify-between">
          <span className="text-emerald-600">Uploaded {new Date(doc.created_at).toLocaleDateString()}</span>
          <Link href={buildStorageUrl(doc.storage_path)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
            View
          </Link>
        </div>
      ) : (
        <p className="mt-1 text-rose-600">Not uploaded yet</p>
      )}
    </li>
  );
}

function buildStorageUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return '#';
  return `${base}/storage/v1/object/public/owner-docs/${path}`;
}

type ContractsSectionProps = {
  ownerId: string;
  contracts: OwnerContractRow[];
  contractEventsMap: Map<number, ContractEventRow[]>;
  ownerEmail: string | null;
  sendContractAction: (formData: FormData) => Promise<void>;
  markContractStatusAction: (formData: FormData) => Promise<void>;
};

function ContractsSection({ ownerId, contracts, contractEventsMap, ownerEmail, sendContractAction, markContractStatusAction }: ContractsSectionProps) {
  if (!contracts.length) {
    return <p className="mt-6 text-sm text-slate-500">No contracts have been generated for this owner yet.</p>;
  }

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-900">Contracts</h2>
      {contracts.map((contract) => {
        const snapshot = (contract.snapshot ?? {}) as ContractSnapshot;
        const events = contractEventsMap.get(contract.id) ?? [];
        const ownerEmailForSend = snapshot.ownerEmail ?? ownerEmail ?? contract.last_sent_to_owner ?? null;
        const guestEmailForSend = snapshot.guestEmail ?? contract.last_sent_to_guest ?? null;
        const lastSentOwner = contract.last_sent_to_owner ?? ownerEmailForSend;
        const lastSentGuest = contract.last_sent_to_guest ?? guestEmailForSend;
        return (
          <div key={contract.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {snapshot?.templateVersion ?? 'pixie_dvc_v1'}
                </p>
                <p className="text-xs text-slate-500">Created {contract.created_at ? new Date(contract.created_at).toLocaleString() : '—'}</p>
              </div>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${contractStatusBadge(contract.status)}`}>
                {contract.status}
              </span>
            </div>
            <div className="mt-3 grid gap-3 text-xs text-slate-600 md:grid-cols-3">
              <div>
                <p className="text-slate-500">Sent at</p>
                <p className="text-slate-900">{contract.sent_at ? new Date(contract.sent_at).toLocaleString() : 'Not sent yet'}</p>
              </div>
              <div>
                <p className="text-slate-500">Last sent to owner</p>
                <p className="text-slate-900">{lastSentOwner ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">Last sent to guest</p>
                <p className="text-slate-900">{lastSentGuest ?? '—'}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <form action={sendContractAction}>
                <input type="hidden" name="contractId" value={contract.id} />
                <input type="hidden" name="ownerId" value={ownerId} />
                <input type="hidden" name="target" value="owner" />
                <button
                  type="submit"
                  className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700"
                  disabled={!ownerEmailForSend}
                >
                  Send to owner
                </button>
              </form>
              <form action={sendContractAction}>
                <input type="hidden" name="contractId" value={contract.id} />
                <input type="hidden" name="ownerId" value={ownerId} />
                <input type="hidden" name="target" value="guest" />
                <button
                  type="submit"
                  className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700 disabled:opacity-50"
                  disabled={!guestEmailForSend}
                >
                  Send to guest
                </button>
              </form>
              <form action={markContractStatusAction}>
                <input type="hidden" name="contractId" value={contract.id} />
                <input type="hidden" name="ownerId" value={ownerId} />
                <input type="hidden" name="status" value="accepted" />
                <button type="submit" className="rounded-full border border-emerald-500 px-3 py-1 font-semibold text-emerald-600">
                  Mark accepted
                </button>
              </form>
              <form action={markContractStatusAction}>
                <input type="hidden" name="contractId" value={contract.id} />
                <input type="hidden" name="ownerId" value={ownerId} />
                <input type="hidden" name="status" value="rejected" />
                <button type="submit" className="rounded-full border border-rose-500 px-3 py-1 font-semibold text-rose-600">
                  Mark rejected
                </button>
              </form>
            </div>

            <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">View contract</summary>
              <div className="mt-3">
                <ContractPreview contract={contract} snapshot={contract.snapshot ?? null} />
              </div>
            </details>

            <div className="mt-3 rounded-xl border border-slate-100 bg-white/60 p-3">
              <p className="text-sm font-semibold text-slate-900">Event history</p>
              {events.length ? (
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {events.map((event) => (
                    <li key={event.id} className="flex items-center justify-between">
                      <span className="capitalize">{event.event_type}</span>
                      <span>{new Date(event.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-500">No events logged.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function contractStatusBadge(status: string) {
  switch (status) {
    case 'sent':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'accepted':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'draft':
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function MissingServiceRole({ ownerId }: { ownerId: string }) {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin · Owner</p>
      <h1 className="text-2xl font-semibold text-slate-900">Service role key required</h1>
      <p className="text-sm text-slate-600">
        To load the owner workspace (<code className="rounded bg-slate-100 px-2 py-1 text-xs">{ownerId}</code>), add{' '}
        <code className="rounded bg-slate-100 px-2 py-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> to your environment so the admin
        dashboard can read owner documents, memberships, and contracts.
      </p>
      <p className="text-xs text-slate-500">
        Once set, restart the dev server and refresh this page.
      </p>
      <Link href="/admin/owners" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
        ← Back to queue
      </Link>
    </div>
  );
}

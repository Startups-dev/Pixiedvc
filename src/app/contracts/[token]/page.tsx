import { notFound } from 'next/navigation';

import { createServiceClient } from '@/lib/supabase-service-client';
import ContractPreview from '@/components/admin/ContractPreview';
import { acceptContractAction, declineContractAction } from './actions';

export default async function ContractTokenPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const supabase = createServiceClient();

  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .or(`owner_accept_token.eq.${token},guest_accept_token.eq.${token}`)
    .maybeSingle();

  if (!contract) {
    notFound();
  }

  const role = contract.owner_accept_token === token ? 'owner' : contract.guest_accept_token === token ? 'guest' : null;
  if (!role) {
    notFound();
  }

  const snapshot = (contract.snapshot ?? {}) as Record<string, unknown>;
  const ownerAccepted = Boolean(contract.owner_accepted_at);
  const guestAccepted = Boolean(contract.guest_accepted_at);
  const fullyAccepted = ownerAccepted && guestAccepted;
  const alreadyAccepted = (role === 'owner' && ownerAccepted) || (role === 'guest' && guestAccepted);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">PixieDVC</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          {role === 'owner' ? 'Owner Agreement' : 'Guest Rental Agreement'}
        </h1>
        <p className="text-sm text-slate-500">Review the terms below and confirm if you agree.</p>
      </header>

      <Summary snapshot={snapshot} role={role} />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <ContractPreview contract={contract} />
      </div>

      {fullyAccepted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
          This agreement has been fully accepted.
        </div>
      ) : alreadyAccepted ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
          You have already accepted this agreement. No further action is required.
        </div>
      ) : (
        <AcceptanceForm token={token} role={role} contract={contract} />
      )}
    </div>
  );
}

function Summary({ snapshot, role }: { snapshot: Record<string, unknown>; role: 'owner' | 'guest' }) {
  const rows = [
    { label: 'Owner', value: snapshot.ownerName ?? '—' },
    { label: 'Home resort', value: snapshot.homeResort ?? '—' },
    { label: 'Use year', value: snapshot.useYearMonth ?? '—' },
    { label: 'Price per point', value: snapshot.pricePerPoint ? `$${snapshot.pricePerPoint}` : '—' },
    { label: 'Guest', value: snapshot.guestName ?? '—' },
    { label: 'Check-in', value: snapshot.checkIn ?? '—' },
    { label: 'Check-out', value: snapshot.checkOut ?? '—' },
    { label: 'Points needed', value: snapshot.pointsAvailable ?? '—' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Reservation summary</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-slate-500">{row.label}</dt>
            <dd className="text-slate-900">{row.value as string}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AcceptanceForm({ token, role }: { token: string; role: 'owner' | 'guest' }) {
  const buttonLabel = role === 'owner' ? 'I am the owner – accept terms' : 'I am the guest – accept terms';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <form action={acceptContractAction} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="confirm" required className="mt-1" />
          I have read and agree to the contract terms above.
        </label>
        <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          {buttonLabel}
        </button>
      </form>
      <form action={declineContractAction} className="mt-3 text-center">
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="text-xs font-semibold text-rose-600">Decline agreement</button>
      </form>
    </div>
  );
}

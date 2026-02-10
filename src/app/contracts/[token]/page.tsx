import { notFound } from 'next/navigation';

import { createServiceClient } from '@/lib/supabase-service-client';
import { renderPixieAgreementHTML } from '@/lib/agreements/renderPixieAgreement';
import type { ContractSnapshot } from '@/lib/contracts/contractSnapshot';
import AcceptanceFormClient from './AcceptanceFormClient';
import { acceptContractAction, declineContractAction } from './actions';

export default async function ContractTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
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

  const snapshot = (contract.snapshot ?? {}) as ContractSnapshot;
  const ownerAccepted = Boolean(contract.owner_accepted_at);
  const guestAccepted = Boolean(contract.guest_accepted_at);
  const fullyAccepted = guestAccepted;
  const alreadyAccepted = role === 'guest' && guestAccepted;
  const { data: eventRow } = await supabase
    .from('contract_events')
    .select('metadata, created_at')
    .eq('contract_id', contract.id)
    .eq('event_type', 'accepted')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const meta = (eventRow?.metadata ?? {}) as Record<string, unknown>;
  const acceptanceIpRaw =
    (typeof meta.guest_ip === 'string' && meta.guest_ip) ||
    (typeof meta.ip === 'string' && meta.ip) ||
    null;

  const { data: bookingRow } = contract.booking_request_id
    ? await supabase
        .from('booking_requests')
        .select('lead_guest_name, lead_guest_email, lead_guest_phone')
        .eq('id', contract.booking_request_id)
        .maybeSingle()
    : { data: null };

  const { data: renterProfile } = contract.renter_id
    ? await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', contract.renter_id)
        .maybeSingle()
    : { data: null };

  const displayGuestName =
    snapshot.parties?.guest?.fullName ||
    bookingRow?.lead_guest_name ||
    renterProfile?.full_name ||
    '—';
  const displayGuestEmail =
    snapshot.parties?.guest?.email ||
    bookingRow?.lead_guest_email ||
    renterProfile?.email ||
    null;
  const displayGuestPhone =
    snapshot.parties?.guest?.phone ||
    bookingRow?.lead_guest_phone ||
    renterProfile?.phone ||
    null;

  const mergedSnapshot: ContractSnapshot = {
    ...snapshot,
    parties: {
      ...snapshot.parties,
      guest: {
        ...snapshot.parties.guest,
        fullName: displayGuestName,
        email: displayGuestEmail,
        phone: displayGuestPhone,
      },
    },
  };

  const agreementHtml = renderPixieAgreementHTML(mergedSnapshot, {
    guestAcceptedAt: contract.guest_accepted_at ?? null,
    acceptanceId: contract.id ?? null,
    acceptanceIp: maskIp(acceptanceIpRaw),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">PixieDVC</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          {role === 'owner' ? 'Owner Agreement' : 'Guest Rental Agreement'}
        </h1>
        <p className="text-sm text-slate-500">Review the terms below and confirm if you agree.</p>
      </header>

      <Summary snapshot={mergedSnapshot} contractId={contract.id} guestName={displayGuestName} />

      <GuestDetails
        snapshot={mergedSnapshot}
        guestName={displayGuestName}
        guestEmail={displayGuestEmail}
        guestPhone={displayGuestPhone}
      />

      <TravelParty snapshot={mergedSnapshot} />

      <div
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        dangerouslySetInnerHTML={{ __html: agreementHtml }}
      />

      {fullyAccepted || alreadyAccepted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
          ✓ Agreement accepted
        </div>
      ) : role === 'owner' ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
          This agreement is read-only for owners. You will be notified once the guest signs.
        </div>
      ) : (
        <>
          <AcceptanceFormClient token={token} onAccept={acceptContractAction} />
          <form action={declineContractAction} className="text-center">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="text-xs font-semibold text-rose-600">
              Decline agreement
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function Summary({
  snapshot,
  contractId,
  guestName,
}: {
  snapshot: ContractSnapshot;
  contractId?: number | null;
  guestName: string;
}) {
  const summary = snapshot.summary;
  const pricePerPoint = `$${(summary.guestPricePerPointCents / 100).toFixed(2)}`;
  const totalRental = `$${(summary.totalPayableByGuestCents / 100).toFixed(2)}`;

  const rows = [
    { label: 'Owner', value: snapshot.parties.owner.fullName || '—' },
    { label: 'Guest', value: guestName || '—' },
    { label: 'Resort', value: summary.resortName || '—' },
    { label: 'Room', value: summary.accommodationType || '—' },
    { label: 'Check-in', value: summary.checkIn || '—' },
    { label: 'Check-out', value: summary.checkOut || '—' },
    { label: 'Points rented', value: summary.pointsRented },
    { label: 'Price per point', value: pricePerPoint },
    { label: 'Total rental price', value: totalRental },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Reservation summary</h2>
      {contractId ? (
        <p className="mt-1 text-xs text-slate-400">Reservation / Contract ID: {contractId}</p>
      ) : null}
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

function GuestDetails({
  snapshot,
  guestName,
  guestEmail,
  guestPhone,
}: {
  snapshot: ContractSnapshot;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
}) {
  const requestId = snapshot.bookingRequestId ?? null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Guest Details</h2>
        {requestId ? (
          <a
            href={`/guest/requests/${requestId}#guest-details`}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-700"
          >
            Edit
          </a>
        ) : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-slate-500">Legal name</dt>
          <dd className="text-slate-900">{guestName || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Email</dt>
          <dd className="text-slate-900">{guestEmail ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Phone</dt>
          <dd className="text-slate-900">{guestPhone ?? '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

function TravelParty({ snapshot }: { snapshot: ContractSnapshot }) {
  const requestId = snapshot.bookingRequestId ?? null;
  const adults = snapshot.occupancy.adults ?? [];
  const youths = snapshot.occupancy.youths ?? [];

  const rows = [
    ...adults.map((name) => ({ name, type: 'Adult' })),
    ...youths.map((name) => ({ name, type: 'Child' })),
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Travel Party</h2>
        {requestId ? (
          <a
            href={`/guest/requests/${requestId}#travel-party`}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-700"
          >
            Edit
          </a>
        ) : null}
      </div>
      {rows.length ? (
        <ul className="mt-3 space-y-2 text-xs text-slate-700">
          {rows.map((row, index) => (
            <li key={`${row.name}-${index}`} className="flex items-center justify-between">
              <span className="text-slate-900">{row.name}</span>
              <span className="text-slate-500">{row.type}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-500">No travel party details yet.</p>
      )}
    </div>
  );
}

function maskIp(value: string | null) {
  if (!value) return null;
  if (value.includes(".")) {
    const parts = value.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }
  if (value.includes(":")) {
    const parts = value.split(":").filter(Boolean);
    return parts.length > 2 ? `${parts.slice(0, 3).join(":")}:…` : value;
  }
  return value;
}

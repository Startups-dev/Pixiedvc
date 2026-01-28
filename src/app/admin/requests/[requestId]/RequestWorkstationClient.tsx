'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_match: 'Pending match',
  pending_owner: 'Pending owner',
  matched: 'Matched',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

export type ActivityEntry = {
  id: string;
  kind: 'note' | 'status_change' | 'availability';
  createdAt: string;
  author: string | null;
  body: string | null;
  fromStatus: string | null;
  toStatus: string | null;
};

export type RequestDetailRecord = {
  id: string;
  status: string | null;
  availabilityStatus: string | null;
  availabilityCheckedAt: string | null;
  resortName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  roomType: string | null;
  partySize: string;
  maxPrice: string;
  renterName: string | null;
  renterEmail: string | null;
  renterPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  requiresAccessibility: boolean | null;
  specialNotes: string | null;
  resortLabel: string | null;
  roomTypeLabel: string | null;
  guests: {
    id: string;
    title: string | null;
    first_name: string | null;
    last_name: string | null;
    age_category: string | null;
    age: number | null;
  }[];
  activity: ActivityEntry[];
};

export default function RequestWorkstationClient({ request }: { request: RequestDetailRecord }) {
  const router = useRouter();
  const [availabilityNote, setAvailabilityNote] = useState('');
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  async function confirmAvailability() {
    setUpdatingAvailability(true);
    const response = await fetch('/api/admin/guests/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: request.id,
        availabilityStatus: 'confirmed',
        note: availabilityNote || undefined,
      }),
    });
    setUpdatingAvailability(false);
    if (!response.ok) {
      alert('Unable to confirm availability.');
      return;
    }
    setAvailabilityNote('');
    router.refresh();
  }

  const availabilityLabel =
    request.availabilityStatus === 'confirmed'
      ? 'Confirmed'
      : request.availabilityStatus === 'not_available'
        ? 'Not available'
        : request.availabilityStatus === 'needs_clarification'
          ? 'Needs clarification'
          : 'Unreviewed';

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/requests"
        className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9aa3b2] hover:text-[#e6e8ec]"
      >
        Back to Requests
      </Link>
      <div className="mt-4 flex flex-col gap-6">
        <div className="rounded-3xl border border-[#23293a] bg-[#151922] p-6 text-[#e6e8ec]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#9aa3b2]">Request Summary</p>
          <h1 className="mt-2 text-2xl font-semibold">{request.renterName ?? 'Guest'}</h1>
          <p className="text-sm text-[#9aa3b2]">{request.renterEmail ?? 'No email on file'}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryStat label="Status" value={STATUS_LABELS[request.status ?? ''] ?? request.status ?? '—'} />
            <SummaryStat
              label="Availability"
              value={<span className={availabilityLabel === 'Confirmed' ? 'text-emerald-400' : undefined}>{availabilityLabel}</span>}
            />
            <SummaryStat label="Resort" value={request.resortName ?? 'Any resort'} />
            <SummaryStat label="Dates" value={formatDates(request.checkIn, request.checkOut)} />
            <SummaryStat label="Room" value={request.roomType ?? 'Any'} />
            <SummaryStat label="Party" value={request.partySize} />
            <SummaryStat label="Max $/pt" value={request.maxPrice} />
          </div>
        </div>

        <div className="rounded-3xl border border-[#23293a] bg-[#151922] p-6 text-[#e6e8ec]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#9aa3b2]">Availability</p>
          <p
            className={`mt-1 text-sm ${
              availabilityLabel === 'Confirmed' ? 'text-emerald-400' : 'text-[#9aa3b2]'
            }`}
          >
            Status: {availabilityLabel}
          </p>
          <textarea
            className="mt-4 min-h-[80px] w-full rounded-2xl border border-[#23293a] bg-[#0f1115] p-3 text-sm text-[#e6e8ec] placeholder:text-[#6b7280]"
            placeholder="Availability note (optional)"
            value={availabilityNote}
            onChange={(event) => setAvailabilityNote(event.target.value)}
          />
          <button
            type="button"
            onClick={confirmAvailability}
            className="mt-3 rounded-full border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-950/40 disabled:opacity-60"
            disabled={updatingAvailability}
          >
            {updatingAvailability ? 'Saving…' : 'Confirm availability'}
          </button>
        </div>

        <div className="rounded-3xl border border-[#23293a] bg-[#151922] p-6 text-[#e6e8ec]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#9aa3b2]">Booking Package</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryStat label="Guest name" value={request.renterName ?? '—'} />
            <SummaryStat label="Email" value={request.renterEmail ?? '—'} />
            <SummaryStat label="Phone" value={request.renterPhone ?? '—'} />
            <SummaryStat label="Party" value={request.partySize} />
            <SummaryStat label="Resort" value={request.resortLabel ?? '—'} />
            <SummaryStat label="Room type" value={request.roomTypeLabel ?? '—'} />
            <SummaryStat label="Address" value={formatAddress(request)} />
            <SummaryStat label="Country" value={request.country ?? '—'} />
            <SummaryStat
              label="Accessibility accommodations"
              value={request.requiresAccessibility ? 'Yes' : 'No'}
            />
            <SummaryStat label="Notes" value={request.specialNotes ?? '—'} />
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9aa3b2]">Party roster</p>
            <div className="mt-3 space-y-2">
              {request.guests.length === 0 ? (
                <p className="text-sm text-[#9aa3b2]">No guest roster submitted yet.</p>
              ) : (
                request.guests.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#23293a] bg-[#0f1115] px-4 py-2 text-sm"
                  >
                    <div className="font-semibold">
                      {[guest.title, guest.first_name, guest.last_name].filter(Boolean).join(' ') || 'Guest'}
                    </div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[#9aa3b2]">
                      {guest.age_category === 'youth' ? 'Child' : 'Adult'}
                      {guest.age_category === 'youth' && guest.age !== null ? ` · ${guest.age}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#23293a] bg-[#151922] p-6 text-[#e6e8ec]">
          <h2 className="text-lg font-semibold">Activity</h2>
          <div className="mt-4 space-y-3">
            {request.activity.length === 0 ? (
              <p className="text-sm text-[#9aa3b2]">No activity recorded yet.</p>
            ) : (
              request.activity.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-[#23293a] p-3 text-sm">
                  <p className="text-xs text-[#9aa3b2]">
                    {new Date(entry.createdAt).toLocaleString()} · {entry.author ?? 'System'}
                  </p>
                  {entry.kind === 'status_change' ? (
                    <p className="mt-1">
                      Status {entry.fromStatus ?? '—'} →{' '}
                      <span className="font-semibold">{entry.toStatus ?? '—'}</span>
                      {entry.body ? ` · ${entry.body}` : ''}
                    </p>
                  ) : (
                    <p className="mt-1">{entry.body ?? 'Availability updated.'}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#23293a] bg-[#151922] p-4 text-xs text-[#9aa3b2]">
          Request ID: <span className="text-[#e6e8ec]">{request.id}</span>
        </div>
      </div>
    </div>
  );
}

function formatDates(checkIn: string | null, checkOut: string | null) {
  const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
  if (!checkIn && !checkOut) {
    return 'Flexible dates';
  }
  if (checkIn && checkOut) {
    return `${formatter.format(new Date(checkIn))} → ${formatter.format(new Date(checkOut))}`;
  }
  if (checkIn) {
    return formatter.format(new Date(checkIn));
  }
  return formatter.format(new Date(checkOut!));
}

function SummaryStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#23293a] bg-[#0f1115] p-3 text-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9aa3b2]">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}

function formatAddress(request: Pick<RequestDetailRecord, 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'postalCode'>) {
  const line1 = request.addressLine1 ?? '';
  const line2 = request.addressLine2 ?? '';
  const city = request.city ?? '';
  const state = request.state ?? '';
  const postal = request.postalCode ?? '';
  const parts = [
    [line1, line2].filter(Boolean).join(' '),
    [city, state, postal].filter(Boolean).join(' '),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

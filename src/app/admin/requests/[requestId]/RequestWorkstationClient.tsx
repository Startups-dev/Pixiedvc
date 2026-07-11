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

const AFFILIATE_TEST_REQUEST_ID = 'b524b3d7-3994-4176-b2fe-9a23c51a0f4c';
const AFFILIATE_TEST_CONFIRMATION_PHRASE = 'SIMULATE AFFILIATE CONVERSION';

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
  affiliateAttribution: {
    affiliateId: string | null;
    affiliateClickId: string | null;
    visitorSessionRowId: string | null;
    visitorSessionId: string | null;
    visitorId: string | null;
    attributionSource: string | null;
    referralCode: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmTerm: string | null;
    utmContent: string | null;
    affiliate: {
      id: string;
      displayName: string | null;
      email: string | null;
      slug: string | null;
      status: string | null;
      tier: string | null;
    } | null;
  };
};

export default function RequestWorkstationClient({ request }: { request: RequestDetailRecord }) {
  const router = useRouter();
  const [availabilityNote, setAvailabilityNote] = useState('');
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [affiliateTestPhrase, setAffiliateTestPhrase] = useState('');
  const [affiliateTestSubmitting, setAffiliateTestSubmitting] = useState<'simulate' | 'reset' | null>(null);
  const [affiliateTestMessage, setAffiliateTestMessage] = useState<string | null>(null);
  const [affiliateTestError, setAffiliateTestError] = useState<string | null>(null);

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

  async function runAffiliateTestAction(action: 'simulate' | 'reset') {
    setAffiliateTestSubmitting(action);
    setAffiliateTestMessage(null);
    setAffiliateTestError(null);

    const response = await fetch('/api/admin/affiliate-conversion-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: request.id,
        confirmationPhrase: affiliateTestPhrase,
        action,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    setAffiliateTestSubmitting(null);

    if (!response.ok || data.error) {
      setAffiliateTestError(data.error ?? 'Affiliate test action failed.');
      return;
    }

    setAffiliateTestMessage(
      data.message ??
        (action === 'simulate'
          ? 'Test conversion created or confirmed. No payment was processed.'
          : 'Affiliate test simulation reset.'),
    );
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
              value={
                <span
                  className={
                    availabilityLabel === 'Confirmed'
                      ? 'font-semibold text-emerald-300'
                      : undefined
                  }
                >
                  {availabilityLabel}
                </span>
              }
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
              availabilityLabel === 'Confirmed'
                ? 'font-semibold text-emerald-300'
                : 'text-[#9aa3b2]'
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
          <p className="text-xs uppercase tracking-[0.3em] text-[#9aa3b2]">Affiliate Attribution</p>
          {request.affiliateAttribution.affiliateId ? (
            <>
              <div className="mt-4 rounded-2xl border border-[#23293a] bg-[#0f1115] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#9aa3b2]">Affiliate</p>
                {request.affiliateAttribution.affiliate ? (
                  <Link
                    href={`/admin/affiliates/${request.affiliateAttribution.affiliate.id}/analytics`}
                    className="mt-1 inline-flex text-lg font-semibold text-[#e6e8ec] hover:text-[#d6b45a]"
                  >
                    {request.affiliateAttribution.affiliate.displayName ?? request.affiliateAttribution.affiliate.email ?? 'Affiliate'}
                  </Link>
                ) : (
                  <p className="mt-1 text-lg font-semibold">Unknown affiliate</p>
                )}
                <p className="mt-1 text-xs text-[#9aa3b2]">
                  {request.affiliateAttribution.affiliate?.email ?? 'No affiliate email loaded'}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <AttributionStat
                  label="Referral slug"
                  value={request.affiliateAttribution.affiliate?.slug ?? request.affiliateAttribution.referralCode}
                  prominent
                />
                <AttributionStat label="Affiliate status" value={formatAffiliateStatus(request.affiliateAttribution)} />
                <AttributionStat label="Attribution source" value={request.affiliateAttribution.attributionSource} />
                <AttributionStat label="Click ID" value={request.affiliateAttribution.affiliateClickId} muted />
                <AttributionStat label="Visitor ID" value={request.affiliateAttribution.visitorId} muted />
                <AttributionStat
                  label="Session ID"
                  value={request.affiliateAttribution.visitorSessionId ?? request.affiliateAttribution.visitorSessionRowId}
                  muted
                />
                <AttributionStat label="UTM source" value={request.affiliateAttribution.utmSource} />
                <AttributionStat label="UTM medium" value={request.affiliateAttribution.utmMedium} />
                <AttributionStat label="UTM campaign" value={request.affiliateAttribution.utmCampaign} />
                <AttributionStat label="UTM term" value={request.affiliateAttribution.utmTerm} />
                <AttributionStat label="UTM content" value={request.affiliateAttribution.utmContent} />
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-2xl border border-[#23293a] bg-[#0f1115] p-4 text-sm text-[#9aa3b2]">
              Not attributed
            </p>
          )}
        </div>

        {request.id === AFFILIATE_TEST_REQUEST_ID ? (
          <div className="rounded-3xl border border-amber-500/30 bg-[#151922] p-6 text-[#e6e8ec]">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Affiliate Test Tools</p>
            <h2 className="mt-2 text-lg font-semibold">Simulate affiliate conversion eligibility</h2>
            <p className="mt-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              Test only. No payment will be processed.
            </p>
            <p className="mt-3 text-sm text-[#9aa3b2]">
              This temporary tool is restricted to this test request. It sets only the canonical fields required by
              the affiliate conversion engine, then invokes the real Phase 3 helper.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.25em] text-[#9aa3b2]">
              Confirmation phrase
            </label>
            <input
              type="text"
              value={affiliateTestPhrase}
              onChange={(event) => setAffiliateTestPhrase(event.target.value)}
              placeholder={AFFILIATE_TEST_CONFIRMATION_PHRASE}
              className="mt-2 w-full rounded-2xl border border-[#23293a] bg-[#0f1115] px-4 py-3 text-sm text-[#e6e8ec] placeholder:text-[#6b7280]"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => runAffiliateTestAction('simulate')}
                disabled={
                  affiliateTestPhrase !== AFFILIATE_TEST_CONFIRMATION_PHRASE ||
                  affiliateTestSubmitting !== null
                }
                className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-[#0f1115] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {affiliateTestSubmitting === 'simulate' ? 'Simulating…' : 'Simulate Confirmed Booking'}
              </button>
              <button
                type="button"
                onClick={() => runAffiliateTestAction('reset')}
                disabled={
                  affiliateTestPhrase !== AFFILIATE_TEST_CONFIRMATION_PHRASE ||
                  affiliateTestSubmitting !== null
                }
                className="rounded-full border border-[#3a3a3a] px-4 py-2 text-sm font-semibold text-[#e6e8ec] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {affiliateTestSubmitting === 'reset' ? 'Resetting…' : 'Reset Affiliate Test'}
              </button>
            </div>
            {affiliateTestMessage ? (
              <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                {affiliateTestMessage}
              </p>
            ) : null}
            {affiliateTestError ? (
              <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
                {affiliateTestError}
              </p>
            ) : null}
          </div>
        ) : null}

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

function AttributionStat({
  label,
  value,
  muted = false,
  prominent = false,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
  prominent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#23293a] bg-[#0f1115] p-3 text-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9aa3b2]">{label}</p>
      <p
        className={`break-all ${
          prominent
            ? 'text-base font-semibold text-[#e6e8ec]'
            : muted
              ? 'text-xs font-medium text-[#9aa3b2]'
              : 'text-base font-semibold text-[#e6e8ec]'
        }`}
      >
        {value || '—'}
      </p>
    </div>
  );
}

function formatAffiliateStatus(attribution: RequestDetailRecord['affiliateAttribution']) {
  const parts = [attribution.affiliate?.status, attribution.affiliate?.tier].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
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

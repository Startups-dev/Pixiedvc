'use client';

import { useMemo, useState } from 'react';

type ResetResult = {
  ok: boolean;
  booking_requests_deleted: number;
  renter_requests_deleted: number;
  rentals_deleted: number;
  confirmed_bookings_deleted: number;
  booking_matches_deleted: number;
  booking_request_guests_deleted: number;
  guest_request_activity_deleted: number;
  contracts_deleted: number;
  contract_events_deleted: number;
  rental_milestones_deleted: number;
  rental_documents_deleted: number;
  rental_exceptions_deleted: number;
  payout_ledger_deleted: number;
};

const REQUIRED_CODE = '2828';

type PlatformToolsClientProps = {
  resetEnabled: boolean;
};

export default function PlatformToolsClient({ resetEnabled }: PlatformToolsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [result, setResult] = useState<ResetResult | null>(null);

  const canSubmit = useMemo(() => code === REQUIRED_CODE && !loading, [code, loading]);

  async function runReset() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/reset-test-data/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => ({}))) as Partial<ResetResult> & { error?: string };

      if (!response.ok) {
        setError(payload.error ?? 'Reset failed.');
        return;
      }

      setResult({
        ok: Boolean(payload.ok),
        booking_requests_deleted: Number(payload.booking_requests_deleted ?? 0),
        renter_requests_deleted: Number(payload.renter_requests_deleted ?? 0),
        rentals_deleted: Number(payload.rentals_deleted ?? 0),
        confirmed_bookings_deleted: Number(payload.confirmed_bookings_deleted ?? 0),
        booking_matches_deleted: Number(payload.booking_matches_deleted ?? 0),
        booking_request_guests_deleted: Number(payload.booking_request_guests_deleted ?? 0),
        guest_request_activity_deleted: Number(payload.guest_request_activity_deleted ?? 0),
        contracts_deleted: Number(payload.contracts_deleted ?? 0),
        contract_events_deleted: Number(payload.contract_events_deleted ?? 0),
        rental_milestones_deleted: Number(payload.rental_milestones_deleted ?? 0),
        rental_documents_deleted: Number(payload.rental_documents_deleted ?? 0),
        rental_exceptions_deleted: Number(payload.rental_exceptions_deleted ?? 0),
        payout_ledger_deleted: Number(payload.payout_ledger_deleted ?? 0),
      });
      setToast('Booking activity reset successfully.');
      setIsModalOpen(false);
      setCode('');
      window.setTimeout(() => setToast(null), 3500);
    } catch {
      setError('Reset failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="space-y-4 rounded-3xl border border-[#3a3a3a] bg-[#2f2f2f] p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Destructive Actions</p>
          <h2 className="text-xl font-semibold" style={{ color: '#64748b' }}>
            Reset Booking Activity
          </h2>
          <p className="text-sm text-[#b4b4b4]">
            Permanently clears operational booking test data while preserving users and account records.
          </p>
          {!resetEnabled ? (
            <p className="text-sm text-[#fca5a5]">Reset unavailable. Set `ALLOW_ADMIN_RESET=true` to enable.</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          disabled={!resetEnabled}
          className="rounded-full bg-[#b91c1c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset Booking Activity
        </button>

        {result ? (
          <div className="rounded-2xl border border-[#3a3a3a] bg-[#212121] p-4 text-sm text-[#d1d5db]">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Last Reset Counts</p>
            <ul className="space-y-1">
              <li>booking_requests_deleted: {result.booking_requests_deleted}</li>
              <li>renter_requests_deleted: {result.renter_requests_deleted}</li>
              <li>rentals_deleted: {result.rentals_deleted}</li>
              <li>confirmed_bookings_deleted: {result.confirmed_bookings_deleted}</li>
              <li>booking_matches_deleted: {result.booking_matches_deleted}</li>
              <li>booking_request_guests_deleted: {result.booking_request_guests_deleted}</li>
              <li>guest_request_activity_deleted: {result.guest_request_activity_deleted}</li>
              <li>contracts_deleted: {result.contracts_deleted}</li>
              <li>contract_events_deleted: {result.contract_events_deleted}</li>
              <li>rental_milestones_deleted: {result.rental_milestones_deleted}</li>
              <li>rental_documents_deleted: {result.rental_documents_deleted}</li>
              <li>rental_exceptions_deleted: {result.rental_exceptions_deleted}</li>
              <li>payout_ledger_deleted: {result.payout_ledger_deleted}</li>
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-3xl border border-dashed border-[#3a3a3a] bg-[#2a2a2a] p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8e8ea0]">Future Tools</h3>
        <div className="space-y-2 text-sm text-[#b4b4b4]">
          <p>Reset Support Activity (coming soon)</p>
          <p>Reset Affiliate Activity (coming soon)</p>
          <p>Seed Test Data (coming soon)</p>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#3a3a3a] bg-[#212121] p-6 text-[#ececec] shadow-2xl">
            <h3 className="text-lg font-semibold">Reset Booking Activity</h3>
            <p className="mt-3 text-sm text-[#d1d5db]">
              This will permanently delete booking requests, renter requests, rentals, and confirmed bookings.
              Users, owners, profiles, affiliates, and admin accounts will NOT be deleted.
            </p>

            <div className="mt-4 space-y-2">
              <label htmlFor="reset-code" className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">
                Enter confirmation code
              </label>
              <input
                id="reset-code"
                value={code}
                onChange={(event) => setCode(event.target.value.trim())}
                inputMode="numeric"
                maxLength={4}
                className="w-full rounded-xl border border-[#3a3a3a] bg-[#111827] px-3 py-2 text-sm text-[#ececec] focus:border-[#64748b] focus:outline-none"
                placeholder="2828"
              />
              <p className="text-xs text-[#8e8ea0]">Type 2828 to confirm</p>
            </div>

            {error ? <p className="mt-3 text-sm text-[#fca5a5]">{error}</p> : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (loading) return;
                  setIsModalOpen(false);
                  setCode('');
                }}
                className="rounded-full border border-[#3a3a3a] px-4 py-2 text-sm text-[#d1d5db] hover:bg-[#2f2f2f]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runReset}
                disabled={!canSubmit}
                className="rounded-full bg-[#b91c1c] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Resetting…' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}

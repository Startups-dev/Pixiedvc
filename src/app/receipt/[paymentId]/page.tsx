// src/app/receipt/[paymentId]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import ReceiptCopyField from './ReceiptCopyField';

type ResortRecord = {
  name: string | null;
  slug: string | null;
  calculator_code: string | null;
};

type PaymentRow = {
  id: string;
  created_at: string | null;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  contract_id: string | null;
  booking_request_id: string | null;
};

type ContractRow = {
  id: string;
  status: string | null;
  guest_confirmation_number: string | null;
  owner_confirmation_number: string | null;
  booking_request_id: string | null;
};

type BookingRequestRow = {
  id: string;
  check_in: string | null;
  check_out: string | null;
  primary_resort: ResortRecord | null;
  confirmed_resort: ResortRecord | null;
};

function formatMoney(cents: number | null, currency: string | null) {
  if (!cents) return '—';
  const amt = cents / 100;
  const cur = (currency ?? 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 2,
    }).format(amt);
  } catch {
    return `${amt.toFixed(2)} ${cur}`;
  }
}

function formatDate(d: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusLabel(s: string | null) {
  const v = (s ?? '').toLowerCase();
  if (!v) return 'Receipt';
  if (v === 'paid') return 'Paid';
  if (v === 'succeeded') return 'Paid';
  if (v === 'pending') return 'Pending';
  if (v === 'failed') return 'Failed';
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(() => {});
        },
      },
    }
  );

  // 1) Payment
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, created_at, amount_cents, currency, status, contract_id, booking_request_id')
    .eq('id', paymentId)
    .maybeSingle<PaymentRow>();

  if (paymentError || !payment) notFound();

  // 2) Contract (optional)
  const contractId = payment.contract_id;
  const { data: contract } = contractId
    ? await supabase
        .from('contracts')
        .select('id, status, guest_confirmation_number, owner_confirmation_number, booking_request_id')
        .eq('id', contractId)
        .maybeSingle<ContractRow>()
    : { data: null };

  // 3) Booking request (optional)
  const bookingRequestId = contract?.booking_request_id ?? payment.booking_request_id;
  const { data: bookingRequest } = bookingRequestId
    ? await supabase
        .from('booking_requests')
        .select(
          `
          id,
          check_in,
          check_out,
          primary_resort:resorts!booking_requests_primary_resort_id_fkey(name, slug, calculator_code),
          confirmed_resort:resorts!booking_requests_confirmed_resort_id_fkey(name, slug, calculator_code)
        `
        )
        .eq('id', bookingRequestId)
        .maybeSingle<BookingRequestRow>()
    : { data: null };

  const resortRecord = bookingRequest?.confirmed_resort ?? bookingRequest?.primary_resort ?? null;
  const resortName = resortRecord?.name ?? 'Your Resort';
  const tripPath = bookingRequestId ? `/my-trip/${bookingRequestId}` : '/my-trip';

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[#0B1B3A]/10 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.26em] text-[#0B1B3A]/55">Receipt</div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#0B1B3A]">
              {statusLabel(payment.status)}
            </h1>
            <p className="mt-2 text-sm text-[#0B1B3A]/65">{resortName}</p>
          </div>

          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.22em] text-[#0B1B3A]/55">Total</div>
            <div className="mt-2 text-2xl font-semibold text-[#0B1B3A]">
              {formatMoney(payment.amount_cents, payment.currency)}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.22em] text-[#0B1B3A]/55">Paid</div>
            <div className="text-xs text-[#0B1B3A]/75">{formatDate(payment.created_at)}</div>
          </div>

          {bookingRequest ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.22em] text-[#0B1B3A]/55">Stay</div>
              <div className="text-xs text-[#0B1B3A]/75">
                {formatDate(bookingRequest.check_in)} → {formatDate(bookingRequest.check_out)}
              </div>
            </div>
          ) : null}

          {contract?.status ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.22em] text-[#0B1B3A]/55">Contract</div>
              <div className="text-xs text-[#0B1B3A]/75">{statusLabel(contract.status)}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <ReceiptCopyField label="Payment ID" value={payment.id} />
          <ReceiptCopyField label="Trip ID" value={bookingRequestId ?? null} />

          <ReceiptCopyField label="Guest confirmation" value={contract?.guest_confirmation_number ?? null} />
          <ReceiptCopyField label="Owner confirmation" value={contract?.owner_confirmation_number ?? null} />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={tripPath}
            className="inline-flex items-center rounded-full bg-[#0B1B3A] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0B1B3A]/90"
          >
            View your trip
          </Link>
          <Link
            href="/my-trip"
            className="inline-flex items-center rounded-full border border-[#0B1B3A]/15 px-5 py-2 text-sm font-semibold text-[#0B1B3A]/85 transition hover:border-[#0B1B3A]/30 hover:text-[#0B1B3A]"
          >
            My trips
          </Link>
        </div>

        <div className="mt-6 text-xs text-[#0B1B3A]/55">
          Tip: click any ID/confirmation to copy.
        </div>
      </div>
    </main>
  );
}


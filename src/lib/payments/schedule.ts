type TransactionRow = {
  txn_type: string | null;
  status: string | null;
  processor: string | null;
  created_at?: string | null;
};

type BookingForSchedule = {
  guest_total_cents?: number | null;
  est_cash?: number | null;
  deposit_due?: number | null;
  check_in?: string | null;
};

export type PaymentScheduleRow = {
  key: 'deposit' | 'booking' | 'checkin' | 'taxes' | 'total';
  label: string;
  amount_cents: number | null;
  status: 'PAID' | 'PENDING' | '—';
  processor: string | '—';
};

export type PaymentScheduleResult = {
  total_cents: number | null;
  lodging_total_cents: number | null;
  total_tax_cents: number | null;
  grand_total_cents: number | null;
  deposit_cents: number | null;
  due_booking_cents: number | null;
  due_checkin_cents: number | null;
  rows: PaymentScheduleRow[];
  warnings: string[];
  missing: string[];
  deposit_source: 'default' | 'request';
};

function daysUntil(dateValue: string | null | undefined) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

export function getPaidNowPercent(checkIn: string | null | undefined) {
  const days = daysUntil(checkIn ?? null);
  return days !== null && days < 90 ? 100 : 70;
}

function statusFromTxn(txn: TransactionRow | null, hasTotal: boolean) {
  if (!hasTotal) return '—';
  if (!txn) return '—';
  return txn.status === 'succeeded' ? 'PAID' : 'PENDING';
}

function normalizeProcessor(value: string | null) {
  if (!value) return '—';
  return value;
}

function pickTransactionByType(transactions: TransactionRow[], txnType: string) {
  const matches = transactions
    .filter((row) => row.txn_type === txnType)
    .sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
  if (matches.length === 0) return null;
  return matches.find((row) => row.status === 'succeeded') ?? matches[0];
}

export function computePaymentSchedule(options: {
  booking: BookingForSchedule | null;
  transactions: TransactionRow[];
  total_tax_cents: number | null;
  tax_warnings?: string[];
}) {
  const warnings: string[] = [...(options.tax_warnings ?? [])];
  const missing: string[] = [];
  const booking = options.booking;

  const totalCents =
    typeof booking?.guest_total_cents === 'number' && booking.guest_total_cents > 0
      ? Math.round(booking.guest_total_cents)
      : typeof booking?.est_cash === 'number' && booking.est_cash > 0
        ? Math.round(Number(booking.est_cash.toFixed(2)) * 100)
        : null;

  const depositFromRequest =
    typeof booking?.deposit_due === 'number' && booking.deposit_due > 0
      ? Math.round(booking.deposit_due * 100)
      : null;
  const depositCents = depositFromRequest ?? 9900;

  if (!totalCents) {
    missing.push('Missing total');
  }

  const totalTaxCents = totalCents !== null ? options.total_tax_cents ?? 0 : 0;
  const grandTotalCents = totalCents !== null ? totalCents + totalTaxCents : null;
  const paidNowPercent = getPaidNowPercent(booking?.check_in ?? null);
  const bookingTranche =
    grandTotalCents !== null ? Math.round(grandTotalCents * (paidNowPercent / 100)) : null;
  const dueBookingCents =
    bookingTranche !== null ? Math.max(bookingTranche - depositCents, 0) : null;
  const dueCheckinCents =
    grandTotalCents !== null && bookingTranche !== null
      ? Math.max(grandTotalCents - bookingTranche, 0)
      : null;

  if (bookingTranche !== null && bookingTranche - depositCents < 0) {
    warnings.push('Deposit exceeds 70% tranche');
  }
  if (totalCents !== null && depositCents > totalCents) {
    warnings.push('Deposit exceeds total');
  }

  const depositPayment = pickTransactionByType(options.transactions, 'deposit');
  const bookingPayment = pickTransactionByType(options.transactions, 'booking');
  const checkinPayment = pickTransactionByType(options.transactions, 'checkin');

  const rows: PaymentScheduleRow[] = [
    {
      key: 'deposit',
      label: `Deposit (${depositFromRequest ? 'from request' : 'default'})`,
      amount_cents: totalCents ? depositCents : null,
      status: statusFromTxn(depositPayment, Boolean(totalCents)),
      processor: totalCents ? normalizeProcessor(depositPayment?.processor ?? null) : '—',
    },
    {
      key: 'booking',
      label: 'Due at booking (70% - deposit)',
      amount_cents: dueBookingCents,
      status: statusFromTxn(bookingPayment, Boolean(totalCents)),
      processor: totalCents ? normalizeProcessor(bookingPayment?.processor ?? null) : '—',
    },
    {
      key: 'checkin',
      label: 'Due at check-in (30%)',
      amount_cents: dueCheckinCents,
      status: statusFromTxn(checkinPayment, Boolean(totalCents)),
      processor: totalCents ? normalizeProcessor(checkinPayment?.processor ?? null) : '—',
    },
    {
      key: 'taxes',
      label: 'Taxes (total)',
      amount_cents: totalCents ? totalTaxCents : null,
      status: '—',
      processor: '—',
    },
    {
      key: 'total',
      label: 'Total',
      amount_cents: grandTotalCents,
      status: '—',
      processor: '—',
    },
  ];

  return {
    total_cents: totalCents,
    lodging_total_cents: totalCents,
    total_tax_cents: totalTaxCents,
    grand_total_cents: grandTotalCents,
    deposit_cents: totalCents ? depositCents : null,
    due_booking_cents: dueBookingCents,
    due_checkin_cents: dueCheckinCents,
    rows,
    warnings,
    missing,
    deposit_source: depositFromRequest ? 'request' : 'default',
  } satisfies PaymentScheduleResult;
}

import type { SupabaseClient } from '@supabase/supabase-js';

type LedgerRow = {
  date: string | null;
  last_tx_at: string | null;
  match_id: string;
  booking_request_id: string | null;
  gross_cents: number;
  platform_cents: number;
  owner_cents: number;
  tax_cents: number;
  processors: string[];
  payment_status: 'PAID' | 'PARTIAL' | 'PENDING';
};

type LedgerTotals = {
  gross_cents: number;
  platform_cents: number;
  owner_cents: number;
  tax_cents: number;
};

export type LedgerReportResult = {
  rows: LedgerRow[];
  totals: LedgerTotals;
};

export async function getLedgerReport(options: {
  client: SupabaseClient;
  start: string;
  endExclusive: string;
}) {
  const { client, start, endExclusive } = options;

  const { data: txnRows, error: txnError } = await client
    .from('transactions')
    .select('id, match_id, booking_request_id, txn_type, amount_cents, processor, created_at')
    .eq('direction', 'in')
    .eq('status', 'succeeded')
    .not('match_id', 'is', null)
    .gte('created_at', start)
    .lt('created_at', endExclusive)
    .order('created_at', { ascending: false });

  if (txnError) {
    throw txnError;
  }

  const transactions = (txnRows ?? []) as Array<{
    id: string;
    match_id: string;
    booking_request_id: string | null;
    txn_type: string | null;
    amount_cents: number | null;
    processor: string | null;
    created_at: string | null;
  }>;

  if (transactions.length === 0) {
    return {
      rows: [],
      totals: { gross_cents: 0, platform_cents: 0, owner_cents: 0, tax_cents: 0 },
    } satisfies LedgerReportResult;
  }

  const txnIds = transactions.map((row) => row.id);
  const txnMatchMap = new Map<string, string>();
  for (const row of transactions) {
    txnMatchMap.set(row.id, row.match_id);
  }

  const { data: splitRows, error: splitError } = await client
    .from('transaction_splits')
    .select('transaction_id, recipient_type, amount_cents')
    .in('transaction_id', txnIds);

  if (splitError) {
    throw splitError;
  }

  const aggregates = new Map<
    string,
    {
      match_id: string;
      latest_created_at: string | null;
      booking_request_id: string | null;
      gross_cents: number;
      platform_cents: number;
      owner_cents: number;
      tax_cents: number;
      owner_split_count: number;
      has_main_payment: boolean;
      has_deposit: boolean;
      processors: Set<string>;
    }
  >();

  for (const txn of transactions) {
    const entry = aggregates.get(txn.match_id) ?? {
      match_id: txn.match_id,
      latest_created_at: txn.created_at ?? null,
      booking_request_id: txn.booking_request_id ?? null,
      gross_cents: 0,
      platform_cents: 0,
      owner_cents: 0,
      tax_cents: 0,
      owner_split_count: 0,
      has_main_payment: false,
      has_deposit: false,
      processors: new Set<string>(),
    };

    entry.gross_cents += txn.amount_cents ?? 0;
    if (txn.processor) {
      entry.processors.add(txn.processor);
    }
    if (txn.created_at) {
      if (!entry.latest_created_at || txn.created_at > entry.latest_created_at) {
        entry.latest_created_at = txn.created_at;
      }
    }
    if (!entry.booking_request_id && txn.booking_request_id) {
      entry.booking_request_id = txn.booking_request_id;
    }
    if (txn.txn_type === 'booking' || txn.txn_type === 'checkin') {
      entry.has_main_payment = true;
    }
    if (txn.txn_type === 'deposit') {
      entry.has_deposit = true;
    }

    aggregates.set(txn.match_id, entry);
  }

  for (const split of (splitRows ?? []) as Array<{
    transaction_id: string;
    recipient_type: string | null;
    amount_cents: number | null;
  }>) {
    const matchId = txnMatchMap.get(split.transaction_id);
    if (!matchId) continue;
    const entry = aggregates.get(matchId);
    if (!entry) continue;
    const amount = split.amount_cents ?? 0;
    if (split.recipient_type === 'platform') {
      entry.platform_cents += amount;
    } else if (split.recipient_type === 'owner') {
      entry.owner_cents += amount;
      entry.owner_split_count += 1;
    } else if (split.recipient_type === 'tax_authority') {
      entry.tax_cents += amount;
    }
  }

  const rows = Array.from(aggregates.values()).map((row) => ({
    date: row.latest_created_at,
    last_tx_at: row.latest_created_at,
    match_id: row.match_id,
    booking_request_id: row.booking_request_id,
    gross_cents: row.gross_cents,
    platform_cents: row.platform_cents,
    owner_cents: row.owner_cents,
    tax_cents: row.tax_cents,
    processors: Array.from(row.processors).sort(),
    payment_status: row.has_main_payment ? 'PAID' : row.has_deposit ? 'PARTIAL' : 'PAID',
  }));

  const totals = rows.reduce(
    (acc, row) => {
      acc.gross_cents += row.gross_cents;
      acc.platform_cents += row.platform_cents;
      acc.owner_cents += row.owner_cents;
      acc.tax_cents += row.tax_cents;
      return acc;
    },
    { gross_cents: 0, platform_cents: 0, owner_cents: 0, tax_cents: 0 },
  );

  const missingBookingIds = rows
    .filter((row) => !row.booking_request_id)
    .map((row) => row.match_id);

  if (missingBookingIds.length > 0) {
    const { data: matchRows, error: matchError } = await client
      .from('booking_matches')
      .select('id, booking_id')
      .in('id', missingBookingIds);

    if (matchError) {
      throw matchError;
    }

    const bookingMap = new Map(
      (matchRows ?? []).map((row) => [row.id as string, row.booking_id as string | null]),
    );

    for (const row of rows) {
      if (!row.booking_request_id) {
        row.booking_request_id = bookingMap.get(row.match_id) ?? null;
      }
    }
  }

  return { rows, totals } satisfies LedgerReportResult;
}

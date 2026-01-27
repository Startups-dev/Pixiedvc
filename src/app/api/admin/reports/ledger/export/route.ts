import { NextResponse } from 'next/server';

import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { logAdminEvent } from '@/lib/admin/audit';
import { getLedgerReport } from '@/lib/admin/reports/ledger';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function clampDateParam(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parts = value.split('-').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return fallback;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, 0, 0, 0);
}

function toIsoStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0).toISOString();
}

function toCsvValue(value: string | number | null) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email ?? null)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  const client = adminClient ?? supabase;

  const url = new URL(request.url);
  const endParam = url.searchParams.get('end');
  const startParam = url.searchParams.get('start');

  const now = new Date();
  const defaultEnd = now;
  const defaultStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);

  const endDate = clampDateParam(endParam, defaultEnd);
  const startDate = clampDateParam(startParam, defaultStart);

  const start = toIsoStart(startDate);
  const endExclusive = toIsoStart(
    new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1),
  );

  const { rows, totals } = await getLedgerReport({
    client,
    start,
    endExclusive,
  });

  const header = [
    'date',
    'last_tx_at',
    'match_id',
    'booking_request_id',
    'gross_cents',
    'platform_cents',
    'owner_cents',
    'tax_cents',
    'processors',
    'status',
  ];

  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [
        toCsvValue(row.date ?? ''),
        toCsvValue(row.last_tx_at ?? ''),
        toCsvValue(row.match_id),
        toCsvValue(row.booking_request_id ?? ''),
        toCsvValue(row.gross_cents),
        toCsvValue(row.platform_cents),
        toCsvValue(row.owner_cents),
        toCsvValue(row.tax_cents),
        toCsvValue(row.processors.join('|')),
        toCsvValue(row.payment_status),
      ].join(','),
    );
  }

  lines.push(
    [
      'Totals',
      '',
      '',
      '',
      totals.gross_cents,
      totals.platform_cents,
      totals.owner_cents,
      totals.tax_cents,
      '',
      `Rows:${rows.length}`,
    ].join(','),
  );

  await logAdminEvent({
    client,
    actorEmail: user.email ?? null,
    actorUserId: user.id,
    action: 'ledger.export_csv',
    entityType: 'ledger',
    entityId: null,
    meta: {
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      row_count: rows.length,
    },
    req: request,
  });

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ledger-${
        startDate.toISOString().slice(0, 10)
      }-to-${endDate.toISOString().slice(0, 10)}.csv"`,
    },
  });
}

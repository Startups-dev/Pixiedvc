import { NextResponse } from 'next/server';

import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
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

  try {
    const { rows, totals } = await getLedgerReport({
      client,
      start,
      endExclusive,
    });
    return NextResponse.json({ ok: true, rows, totals });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load ledger.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

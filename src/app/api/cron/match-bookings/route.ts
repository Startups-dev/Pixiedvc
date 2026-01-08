import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { runMatchBookings } from '@/lib/match-bookings';

export const dynamic = 'force-dynamic';

async function handleMatchBookings(request: NextRequest) {
  let dryRun = request.nextUrl.searchParams.get('dryRun') === '1';
  if (request.method === 'POST') {
    try {
      const payload = (await request.json()) as { dryRun?: boolean } | null;
      if (payload?.dryRun) {
        dryRun = true;
      }
    } catch {
      // Ignore malformed JSON; dryRun stays based on query params.
    }
  }

  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || headerSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: 'Service role key not configured' },
      { status: 500 },
    );
  }

  const lockName = 'match-bookings';
  const now = new Date();
  const nowIso = now.toISOString();
  const lockUntil = new Date(now.getTime() + 60_000).toISOString();

  if (!dryRun) {
    const { error: lockInsertError } = await client
      .from('cron_locks')
      .upsert(
        { name: lockName, locked_until: nowIso },
        { onConflict: 'name', ignoreDuplicates: true },
      );

    if (lockInsertError) {
      return NextResponse.json(
        { error: lockInsertError.message },
        { status: 500 },
      );
    }

    const { data: lockRows, error: lockError } = await client
      .from('cron_locks')
      .update({ locked_until: lockUntil })
      .eq('name', lockName)
      .lt('locked_until', nowIso)
      .select('locked_until');

    if (lockError) {
      return NextResponse.json(
        { error: lockError.message },
        { status: 500 },
      );
    }

    if (!lockRows || lockRows.length === 0) {
      const { data: existingLock } = await client
        .from('cron_locks')
        .select('locked_until')
        .eq('name', lockName)
        .maybeSingle();

      return NextResponse.json(
        { error: 'Locked', locked_until: existingLock?.locked_until ?? null },
        { status: 429 },
      );
    }
  }

  const origin = request.nextUrl.origin;
  const result = await runMatchBookings({
    client,
    origin,
    dryRun,
    now,
    sendEmails: !dryRun,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return handleMatchBookings(request);
}

export async function POST(request: NextRequest) {
  return handleMatchBookings(request);
}

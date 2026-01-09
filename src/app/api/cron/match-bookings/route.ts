import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { runMatchBookings, type MatchRunResult } from '@/lib/match-bookings';

function getProvidedSecret(headers: Headers) {
  const headerSecret = headers.get('x-cron-secret');
  if (headerSecret) return headerSecret;

  const auth = headers.get('authorization');
  if (!auth) return null;
  const [type, token] = auth.split(' ');
  if (type?.toLowerCase() !== 'bearer') return null;
  return token ?? null;
}

async function countTableRows(client: ReturnType<typeof getSupabaseAdminClient>, table: string, step: string, errors: MatchRunResult['errors']) {
  if (!client) return null;
  const { count, error } = await client.from(table).select('id', { head: true, count: 'exact' });
  if (error) {
    errors.push({ step, message: error.message });
    return null;
  }
  return typeof count === 'number' ? count : null;
}

function parseProjectRef(url?: string | null) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return host.split('.')[0] ?? null;
  } catch {
    return null;
  }
}

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
  const providedSecret = getProvidedSecret(request.headers);
  const nodeEnv = process.env.NODE_ENV;
  const hasCronSecret = Boolean(cronSecret);
  const hasHeaderSecret = Boolean(request.headers.get('x-cron-secret'));
  const hasAuthHeader = Boolean(request.headers.get('authorization'));

  if (!cronSecret || providedSecret !== cronSecret) {
    const unauthorizedPayload = { error: 'Unauthorized' };
    if (nodeEnv === 'development') {
      return NextResponse.json(
        {
          ...unauthorizedPayload,
          debug: {
            hasCronSecret,
            hasHeaderSecret,
            hasAuthHeader,
          },
        },
        { status: 401 },
      );
    }
    return NextResponse.json(unauthorizedPayload, { status: 401 });
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

  const responseErrors = [...result.errors];
  const verifiedMatchIds: string[] = [];

  for (const matchId of result.matchIds) {
    const { data: matchRow, error: matchError } = await client
      .from('booking_matches')
      .select('id')
      .eq('id', matchId)
      .maybeSingle();

    if (matchError) {
      responseErrors.push({ step: 'verify_match', message: matchError.message });
      continue;
    }

    if (!matchRow) {
      responseErrors.push({ step: 'verify_match', message: 'match_not_found' });
      continue;
    }

    verifiedMatchIds.push(matchId);
  }

  const bookingMatchesCount = await countTableRows(
    client,
    'booking_matches',
    'count_booking_matches',
    responseErrors,
  );
  const bookingRequestsCount = await countTableRows(
    client,
    'booking_requests',
    'count_booking_requests',
    responseErrors,
  );

  const projectRef = parseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL ?? null);

  const payload = {
    ...result,
    matchesCreated: verifiedMatchIds.length,
    matchIds: verifiedMatchIds,
    errors: responseErrors,
    dryRun: result.dryRun,
    ok: result.ok && responseErrors.length === 0,
    dbCounts: {
      bookingMatchesCount: bookingMatchesCount ?? 0,
      bookingRequestsCount: bookingRequestsCount ?? 0,
    },
    projectRef,
  };

  if (!payload.ok) {
    return NextResponse.json(payload, { status: 500 });
  }

  return NextResponse.json(payload);
}

export async function GET(request: NextRequest) {
  return handleMatchBookings(request);
}

export async function POST(request: NextRequest) {
  return handleMatchBookings(request);
}

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

  const responseErrors: MatchRunResult['errors'] = [];
  const createMatchFailures: MatchRunResult['errors'] = [];
  const evaluatedBookings = result.evaluatedBookings.map((booking) => ({
    ...booking,
    skipReasons: [...booking.skipReasons],
  }));
  const evaluatedMap = new Map(
    evaluatedBookings.map((booking, index) => [booking.bookingId, index]),
  );

  for (const error of result.errors) {
    if (error.step === 'apply_booking_match' || error.step === 'create_match') {
      createMatchFailures.push(error);
      continue;
    }
    responseErrors.push(error);
  }

  for (const failure of createMatchFailures) {
    responseErrors.push({
      bookingId: failure.bookingId,
      step: 'create_match',
      message: failure.message,
    });
    const index = evaluatedMap.get(failure.bookingId);
    if (index !== undefined) {
      evaluatedBookings[index] = {
        ...evaluatedBookings[index],
        finalDecision: 'skipped',
        skipReasons: Array.from(
          new Set([
            ...evaluatedBookings[index].skipReasons,
            'match_create_failed',
          ]),
        ),
      };
    }
  }

  const verifiedMatchIds: string[] = [];
  let verifyFailed = false;

  if (createMatchFailures.length === 0) {
    for (const matchId of result.matchIds) {
      const { data: matchRow, error: matchError } = await client
        .from('booking_matches')
        .select('id')
        .eq('id', matchId)
        .maybeSingle();

      if (matchError) {
        responseErrors.push({
          bookingId: matchId,
          step: 'verify_match',
          message: matchError.message,
        });
        verifyFailed = true;
        continue;
      }

      if (!matchRow) {
        responseErrors.push({
          bookingId: matchId,
          step: 'verify_match',
          message: 'match_not_found',
        });
        verifyFailed = true;
        continue;
      }

      verifiedMatchIds.push(matchId);
    }
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
  const adminHasServiceKey = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE,
  );
  const adminProjectRef = parseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL ?? null);
  const persistenceFailed = createMatchFailures.length > 0 || verifyFailed;

  if (persistenceFailed) {
    for (let i = 0; i < evaluatedBookings.length; i += 1) {
      if (evaluatedBookings[i].finalDecision === 'matched') {
        evaluatedBookings[i] = {
          ...evaluatedBookings[i],
          finalDecision: 'skipped',
          skipReasons: Array.from(
            new Set([
              ...evaluatedBookings[i].skipReasons,
              createMatchFailures.length > 0
                ? 'match_create_failed'
                : 'match_verify_failed',
            ]),
          ),
        };
      }
    }
  }

  const payload = {
    ...result,
    matchesCreated: persistenceFailed ? 0 : verifiedMatchIds.length,
    matchIds: persistenceFailed ? [] : verifiedMatchIds,
    errors: responseErrors,
    dryRun: result.dryRun,
    ok: result.ok && responseErrors.length === 0 && !persistenceFailed,
    dbCounts: {
      bookingMatchesCount: bookingMatchesCount ?? 0,
      bookingRequestsCount: bookingRequestsCount ?? 0,
    },
    projectRef,
    evaluatedBookings,
  };

  if (nodeEnv === 'development') {
    payload.debug = {
      adminHasServiceKey,
      adminProjectRef,
    };
  }

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

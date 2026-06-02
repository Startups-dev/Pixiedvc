import { NextRequest, NextResponse } from 'next/server';

import { completeAutomationRun, startAutomationRun } from '@/lib/automation-runs';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { runWelcomeSequence, WELCOME_SEQUENCE_AUTOMATION_KEY } from '@/lib/welcome-sequence';

export const dynamic = 'force-dynamic';

function getProvidedSecret(headers: Headers) {
  const headerSecret = headers.get('x-cron-secret');
  if (headerSecret) return headerSecret;

  const auth = headers.get('authorization');
  if (!auth) return null;
  const [type, token] = auth.split(' ');
  if (type?.toLowerCase() !== 'bearer') return null;
  return token ?? null;
}

async function acquireLock(client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, nowIso: string, lockUntil: string, seedIso: string) {
  const lockName = 'welcome-sequence';

  const { error: lockInsertError } = await client
    .from('cron_locks')
    .upsert({ name: lockName, locked_until: seedIso }, { onConflict: 'name', ignoreDuplicates: true });

  if (lockInsertError) {
    return { ok: false as const, response: NextResponse.json({ error: lockInsertError.message }, { status: 500 }) };
  }

  const { data: lockRows, error: lockError } = await client
    .from('cron_locks')
    .update({ locked_until: lockUntil })
    .eq('name', lockName)
    .lt('locked_until', nowIso)
    .select('locked_until');

  if (lockError) {
    return { ok: false as const, response: NextResponse.json({ error: lockError.message }, { status: 500 }) };
  }

  if (!lockRows || lockRows.length === 0) {
    const { data: existingLock } = await client.from('cron_locks').select('locked_until').eq('name', lockName).maybeSingle();
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Locked', locked_until: existingLock?.locked_until ?? null }, { status: 429 }),
    };
  }

  return { ok: true as const };
}

async function handleWelcomeSequence(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = getProvidedSecret(request.headers);

  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';
  const now = new Date();

  if (!dryRun) {
    const lock = await acquireLock(
      client,
      now.toISOString(),
      new Date(now.getTime() + 60_000).toISOString(),
      new Date(now.getTime() - 1_000).toISOString(),
    );
    if (!lock.ok) {
      return lock.response;
    }
  }

  const run = await startAutomationRun({
    client,
    automationKey: WELCOME_SEQUENCE_AUTOMATION_KEY,
    startedAt: now,
    metadata: { dryRun },
  });

  try {
    const result = await runWelcomeSequence({
      client,
      now,
      dryRun,
    });

    await completeAutomationRun({
      client,
      runId: run?.id ?? null,
      automationKey: WELCOME_SEQUENCE_AUTOMATION_KEY,
      startedAt: run?.startedAt ?? now,
      ok: result.ok,
      candidates: result.candidates,
      sent: result.sent,
      skipped: result.skipped.length,
      errors: result.errors.length,
      lastError: result.errors.at(-1)?.message ?? null,
      metadata: {
        dryRun,
        now: result.now,
      },
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    await completeAutomationRun({
      client,
      runId: run?.id ?? null,
      automationKey: WELCOME_SEQUENCE_AUTOMATION_KEY,
      startedAt: run?.startedAt ?? now,
      ok: false,
      candidates: 0,
      sent: 0,
      skipped: 0,
      errors: 1,
      lastError: error instanceof Error ? error.message : 'unknown_automation_error',
      metadata: { dryRun },
    });
    throw error;
  }
}

export async function GET(request: NextRequest) {
  return handleWelcomeSequence(request);
}

export async function POST(request: NextRequest) {
  return handleWelcomeSequence(request);
}

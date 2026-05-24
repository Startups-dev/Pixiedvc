import { describe, expect, it, vi } from 'vitest';

import { completeAutomationRun, startAutomationRun } from '@/lib/automation-runs';

function createClient() {
  const insertSingle = vi.fn(async () => ({ data: { id: 'run-1' }, error: null }));
  const insertSelect = vi.fn(() => ({ single: insertSingle }));
  const insert = vi.fn(() => ({ select: insertSelect }));

  const updateEq = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => ({ eq: updateEq }));

  return {
    client: {
      from: vi.fn((table: string) => {
        if (table !== 'automation_runs') throw new Error(`Unexpected table: ${table}`);
        return {
          insert,
          update,
        };
      }),
    },
    insert,
    update,
    updateEq,
  };
}

describe('automation run tracking', () => {
  it('creates a running row when an automation starts', async () => {
    const state = createClient();
    const startedAt = new Date('2026-05-24T12:00:00.000Z');

    const run = await startAutomationRun({
      client: state.client as never,
      automationKey: 'owner_match_reminders',
      startedAt,
      metadata: { dryRun: false },
    });

    expect(run).toEqual({ id: 'run-1', startedAt });
    expect(state.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        automation_key: 'owner_match_reminders',
        status: 'running',
        started_at: startedAt.toISOString(),
        metadata: { dryRun: false },
      }),
    );
  });

  it('marks partial-success runs as completed_with_errors', async () => {
    const state = createClient();
    const startedAt = new Date('2026-05-24T12:00:00.000Z');
    const completedAt = new Date('2026-05-24T12:00:05.250Z');

    await completeAutomationRun({
      client: state.client as never,
      runId: 'run-1',
      automationKey: 'owner_match_reminders',
      startedAt,
      completedAt,
      ok: false,
      candidates: 20,
      sent: 18,
      skipped: 0,
      errors: 2,
      lastError: 'owner_email_missing',
      metadata: { reminderHours: 18 },
    });

    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed_with_errors',
        duration_ms: 5250,
        candidates: 20,
        sent: 18,
        skipped: 0,
        errors: 2,
        last_error: 'owner_email_missing',
      }),
    );
  });

  it('marks fatal runs as failed', async () => {
    const state = createClient();
    const startedAt = new Date('2026-05-24T12:00:00.000Z');
    const completedAt = new Date('2026-05-24T12:00:01.000Z');

    await completeAutomationRun({
      client: state.client as never,
      runId: 'run-1',
      automationKey: 'unsigned_agreement_reminders',
      startedAt,
      completedAt,
      ok: false,
      candidates: 0,
      sent: 0,
      skipped: 0,
      errors: 1,
      lastError: 'query_failed',
      metadata: {},
    });

    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        errors: 1,
        last_error: 'query_failed',
      }),
    );
  });
});

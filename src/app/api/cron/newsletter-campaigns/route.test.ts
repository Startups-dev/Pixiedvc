import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
  startAutomationRun: vi.fn(),
  completeAutomationRun: vi.fn(),
  runScheduledNewsletterCampaigns: vi.fn(),
  cronLocks: {
    lockedUntil: '2026-06-01T00:00:00.000Z',
  },
}));

function makeAdminClient() {
  return {
    from: (table: string) => {
      if (table !== 'cron_locks') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        upsert: async () => ({ error: null }),
        update: () => ({
          eq: () => ({
            lt: () => ({
              select: async () => ({ data: [{ locked_until: state.cronLocks.lockedUntil }], error: null }),
            }),
          }),
        }),
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { locked_until: state.cronLocks.lockedUntil }, error: null }),
          }),
        }),
      };
    },
  };
}

state.getSupabaseAdminClient.mockImplementation(() => makeAdminClient());

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: state.getSupabaseAdminClient,
}));

vi.mock('@/lib/automation-runs', () => ({
  startAutomationRun: state.startAutomationRun,
  completeAutomationRun: state.completeAutomationRun,
}));

vi.mock('@/lib/newsletter-campaign-scheduler', () => ({
  NEWSLETTER_CAMPAIGNS_AUTOMATION_KEY: 'newsletter_campaigns',
  runScheduledNewsletterCampaigns: state.runScheduledNewsletterCampaigns,
}));

import { GET } from '@/app/api/cron/newsletter-campaigns/route';

describe('/api/cron/newsletter-campaigns', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'secret';
    state.startAutomationRun.mockReset();
    state.completeAutomationRun.mockReset();
    state.runScheduledNewsletterCampaigns.mockReset();
    state.getSupabaseAdminClient.mockImplementation(() => makeAdminClient());
    state.startAutomationRun.mockResolvedValue({
      id: 'run-1',
      startedAt: new Date('2026-06-02T10:00:00.000Z'),
    });
    state.completeAutomationRun.mockResolvedValue(undefined);
    state.runScheduledNewsletterCampaigns.mockResolvedValue({
      ok: true,
      now: '2026-06-02T10:00:00.000Z',
      campaignsProcessed: 1,
      candidates: 20,
      sent: 19,
      skipped: 1,
      failed: 0,
      errors: [],
    });
  });

  it('rejects requests without the cron secret', async () => {
    const request = new NextRequest('http://localhost:3012/api/cron/newsletter-campaigns');
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(state.runScheduledNewsletterCampaigns).not.toHaveBeenCalled();
  });

  it('runs the scheduler and records automation runs', async () => {
    const request = new NextRequest('http://localhost:3012/api/cron/newsletter-campaigns', {
      headers: {
        'x-cron-secret': 'secret',
      },
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(state.runScheduledNewsletterCampaigns).toHaveBeenCalledTimes(1);
    expect(state.completeAutomationRun).toHaveBeenCalledWith(
      expect.objectContaining({
        automationKey: 'newsletter_campaigns',
        candidates: 20,
        sent: 19,
        skipped: 1,
        errors: 0,
        metadata: expect.objectContaining({
          campaigns_processed: 1,
        }),
      }),
    );
    expect(payload).toMatchObject({
      ok: true,
      campaignsProcessed: 1,
    });
  });
});

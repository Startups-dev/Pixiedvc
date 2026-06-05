import { beforeEach, describe, expect, it, vi } from 'vitest';

type CampaignRow = {
  id: string;
  status: string;
  scheduled_at: string | null;
};

const state = vi.hoisted(() => ({
  campaigns: [] as CampaignRow[],
  sendNewsletterCampaignNow: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}));

function makeAdminClient() {
  return {
    from: (table: string) => {
      if (table !== 'email_campaigns') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => {
          const filters: Array<(row: CampaignRow) => boolean> = [];
          const query = {
            eq(column: keyof CampaignRow, value: unknown) {
              filters.push((row) => row[column] === value);
              return query;
            },
            lte(column: keyof CampaignRow, value: string) {
              filters.push((row) => {
                const rowValue = row[column];
                return typeof rowValue === 'string' && rowValue <= value;
              });
              return query;
            },
            order() {
              return query;
            },
            limit() {
              return query;
            },
            then(resolve: (value: { data: CampaignRow[]; error: null }) => void) {
              resolve({
                data: state.campaigns.filter((row) => filters.every((filter) => filter(row))),
                error: null,
              });
            },
          };
          return query;
        },
      };
    },
  };
}

state.getSupabaseAdminClient.mockImplementation(() => makeAdminClient());

vi.mock('@/lib/newsletter-campaign-send', () => ({
  sendNewsletterCampaignNow: state.sendNewsletterCampaignNow,
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: state.getSupabaseAdminClient,
}));

import { runScheduledNewsletterCampaigns } from '@/lib/newsletter-campaign-scheduler';

describe('runScheduledNewsletterCampaigns', () => {
  beforeEach(() => {
    state.campaigns = [];
    state.sendNewsletterCampaignNow.mockReset();
  });

  it('discovers due scheduled campaigns and ignores future, paused, and archived campaigns', async () => {
    state.campaigns = [
      { id: 'campaign-due', status: 'scheduled', scheduled_at: '2026-06-01T10:00:00.000Z' },
      { id: 'campaign-future', status: 'scheduled', scheduled_at: '2026-06-05T10:00:00.000Z' },
      { id: 'campaign-paused', status: 'paused', scheduled_at: '2026-06-01T09:00:00.000Z' },
      { id: 'campaign-archived', status: 'archived', scheduled_at: '2026-06-01T09:00:00.000Z' },
    ];
    state.sendNewsletterCampaignNow.mockResolvedValue({
      audienceCount: 10,
      sent: 9,
      skipped: 1,
      failed: 0,
      errors: [],
    });

    const result = await runScheduledNewsletterCampaigns({
      client: makeAdminClient() as never,
      now: new Date('2026-06-02T10:00:00.000Z'),
    });

    expect(state.sendNewsletterCampaignNow).toHaveBeenCalledTimes(1);
    expect(state.sendNewsletterCampaignNow).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 'campaign-due',
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      campaignsProcessed: 1,
      candidates: 10,
      sent: 9,
      skipped: 1,
      failed: 0,
    });
  });

  it('supports dry run without invoking the send engine', async () => {
    state.campaigns = [
      { id: 'campaign-due', status: 'scheduled', scheduled_at: '2026-06-01T10:00:00.000Z' },
    ];

    const result = await runScheduledNewsletterCampaigns({
      client: makeAdminClient() as never,
      now: new Date('2026-06-02T10:00:00.000Z'),
      dryRun: true,
    });

    expect(state.sendNewsletterCampaignNow).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      campaignsProcessed: 1,
      candidates: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    });
  });

  it('treats locked duplicate runs as skipped', async () => {
    state.campaigns = [{ id: 'campaign-due', status: 'scheduled', scheduled_at: '2026-06-01T10:00:00.000Z' }];
    state.sendNewsletterCampaignNow.mockRejectedValue(new Error('campaign_send_locked'));

    const result = await runScheduledNewsletterCampaigns({
      client: makeAdminClient() as never,
      now: new Date('2026-06-02T10:00:00.000Z'),
    });

    expect(result).toMatchObject({
      ok: true,
      campaignsProcessed: 1,
      skipped: 1,
      failed: 0,
    });
  });

  it('collects partial failures from the existing send engine', async () => {
    state.campaigns = [{ id: 'campaign-due', status: 'scheduled', scheduled_at: '2026-06-01T10:00:00.000Z' }];
    state.sendNewsletterCampaignNow.mockResolvedValue({
      audienceCount: 4,
      sent: 2,
      skipped: 0,
      failed: 2,
      errors: [{ message: 'send_failed' }, { message: 'render_failed' }],
    });

    const result = await runScheduledNewsletterCampaigns({
      client: makeAdminClient() as never,
      now: new Date('2026-06-02T10:00:00.000Z'),
    });

    expect(result).toMatchObject({
      ok: false,
      campaignsProcessed: 1,
      candidates: 4,
      sent: 2,
      failed: 2,
      errors: [
        { campaignId: 'campaign-due', message: 'send_failed' },
        { campaignId: 'campaign-due', message: 'render_failed' },
      ],
    });
  });
});

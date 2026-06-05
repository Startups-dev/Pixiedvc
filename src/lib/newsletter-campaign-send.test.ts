import { beforeEach, describe, expect, it, vi } from 'vitest';

type CampaignState = {
  id: string;
  name: string | null;
  subject: string;
  preview_text: string | null;
  content_json: Record<string, unknown> | null;
  segment_slug: string | null;
  status: string;
  sent_at?: string | null;
};

type SubscriberState = {
  id: string;
  email: string;
  status: string;
  tags: string[] | null;
  suppressed_at: string | null;
  email_preferences: Record<string, unknown> | null;
  is_founding_owner: boolean;
  last_email_sent_at?: string | null;
};

type CampaignSubscriberState = {
  campaign_id: string;
  subscriber_id: string;
  sent_at: string | null;
};

const state = vi.hoisted(() => ({
  campaign: null as CampaignState | null,
  subscribers: [] as SubscriberState[],
  campaignSubscribers: [] as CampaignSubscriberState[],
  emailEvents: [] as Array<{ subscriber_id: string; event_type: string; metadata: Record<string, unknown> }>,
  sendResultsByEmail: new Map<string, { status: 'sent' | 'failed' }>(),
  createOrRotateUnsubscribeToken: vi.fn(async (subscriberId: string) => ({
    token: `token-${subscriberId}`,
    tokenHash: `hash-${subscriberId}`,
  })),
  buildUnsubscribeUrl: vi.fn((token: string) => `https://pixiedvc.test/unsubscribe/${token}`),
  sendPlainEmail: vi.fn(async (payload: Record<string, unknown>) => state.sendResultsByEmail.get(String(payload.to)) ?? { status: 'sent' as const }),
  getSupabaseAdminClient: vi.fn(),
}));

function filterSubscribers(filters: Array<(row: SubscriberState) => boolean>) {
  return state.subscribers.filter((row) => filters.every((filter) => filter(row)));
}

function makeAdminClient() {
  return {
    from: (table: string) => {
      if (table === 'email_campaigns') {
        return {
          select: () => ({
            eq: (_column: string, value: string) => ({
              maybeSingle: async () => ({
                data: state.campaign?.id === value ? state.campaign : null,
                error: null,
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => {
            const filters: Array<(row: CampaignState) => boolean> = [];
            const query = {
              eq(column: keyof CampaignState, value: unknown) {
                filters.push((row) => row[column] === value);
                return query;
              },
              select() {
                return query;
              },
              async maybeSingle() {
                if (!state.campaign || !filters.every((filter) => filter(state.campaign!))) {
                  return { data: null, error: null };
                }
                Object.assign(state.campaign, payload);
                return { data: { id: state.campaign.id }, error: null };
              },
              then(resolve: (value: { error: null }) => void) {
                if (state.campaign && filters.every((filter) => filter(state.campaign!))) {
                  Object.assign(state.campaign, payload);
                }
                resolve({ error: null });
              },
            };
            return query;
          },
        };
      }

      if (table === 'email_subscribers') {
        return {
          select: () => {
            const filters: Array<(row: SubscriberState) => boolean> = [];
            const query = {
              eq(column: keyof SubscriberState, value: unknown) {
                filters.push((row) => row[column] === value);
                return query;
              },
              is(column: keyof SubscriberState, value: null) {
                filters.push((row) => row[column] === value);
                return query;
              },
              contains(column: keyof SubscriberState, values: string[]) {
                filters.push((row) => values.every((item) => (row[column] as string[] | null)?.includes(item)));
                return query;
              },
              limit() {
                return query;
              },
              maybeSingle: async () => ({
                data: filterSubscribers(filters)[0] ?? null,
                error: null,
              }),
              then(resolve: (value: { data: SubscriberState[]; error: null }) => void) {
                resolve({
                  data: filterSubscribers(filters),
                  error: null,
                });
              },
            };
            return query;
          },
          update: (payload: Record<string, unknown>) => ({
            eq: async (_column: string, value: string) => {
              const row = state.subscribers.find((subscriber) => subscriber.id === value);
              if (row) {
                Object.assign(row, payload);
              }
              return { error: null };
            },
          }),
        };
      }

      if (table === 'email_campaign_subscribers') {
        return {
          upsert: async (rows: Array<Record<string, unknown>>) => {
            for (const row of rows) {
              const exists = state.campaignSubscribers.find(
                (entry) =>
                  entry.campaign_id === row.campaign_id &&
                  entry.subscriber_id === row.subscriber_id,
              );
              if (!exists) {
                state.campaignSubscribers.push({
                  campaign_id: String(row.campaign_id),
                  subscriber_id: String(row.subscriber_id),
                  sent_at: null,
                });
              }
            }
            return { error: null };
          },
          select: () => {
            const filters: Array<(row: CampaignSubscriberState) => boolean> = [];
            const query = {
              eq(column: keyof CampaignSubscriberState, value: unknown) {
                filters.push((row) => row[column] === value);
                return query;
              },
              then(resolve: (value: { data: CampaignSubscriberState[]; error: null }) => void) {
                resolve({
                  data: state.campaignSubscribers.filter((row) => filters.every((filter) => filter(row))),
                  error: null,
                });
              },
            };
            return query;
          },
          update: (payload: Record<string, unknown>) => {
            const filters: Array<(row: CampaignSubscriberState) => boolean> = [];
            const query = {
              eq(column: keyof CampaignSubscriberState, value: unknown) {
                filters.push((row) => row[column] === value);
                return query;
              },
              then(resolve: (value: { error: null }) => void) {
                const row = state.campaignSubscribers.find((entry) => filters.every((filter) => filter(entry)));
                if (row) {
                  Object.assign(row, payload);
                }
                resolve({ error: null });
              },
            };
            return query;
          },
        };
      }

      if (table === 'email_events') {
        return {
          insert: async (payload: Record<string, unknown>) => {
            state.emailEvents.push({
              subscriber_id: String(payload.subscriber_id),
              event_type: String(payload.event_type),
              metadata: (payload.metadata as Record<string, unknown>) ?? {},
            });
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

state.getSupabaseAdminClient.mockImplementation(() => makeAdminClient());

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: state.getSupabaseAdminClient,
}));

vi.mock('@/lib/email-subscribers', () => ({
  createOrRotateUnsubscribeToken: state.createOrRotateUnsubscribeToken,
  buildUnsubscribeUrl: state.buildUnsubscribeUrl,
}));

vi.mock('@/lib/email', () => ({
  sendPlainEmail: state.sendPlainEmail,
}));

import { resolveNewsletterCampaignAudience, sendNewsletterCampaignNow } from '@/lib/newsletter-campaign-send';

describe('newsletter campaign send', () => {
  beforeEach(() => {
    state.campaign = {
      id: 'campaign-1',
      name: 'June Newsletter',
      subject: 'June Disney Villa Highlights',
      preview_text: 'Fresh Disney inventory this month.',
      content_json: {
        body_sections: [{ title: 'Featured', content: 'Inventory is live now.' }],
        primary_cta_label: 'Browse Ready Stays',
        primary_cta_url: 'https://pixiedvc.test/ready-stays',
      },
      segment_slug: 'guest_leads',
      status: 'draft',
      sent_at: null,
    };
    state.subscribers = [
      {
        id: 'subscriber-1',
        email: 'guest1@example.com',
        status: 'subscribed',
        tags: ['guest_lead', 'newsletter_subscriber'],
        suppressed_at: null,
        email_preferences: { marketing: true },
        is_founding_owner: false,
        last_email_sent_at: null,
      },
      {
        id: 'subscriber-2',
        email: 'guest2@example.com',
        status: 'unsubscribed',
        tags: ['guest_lead', 'newsletter_subscriber'],
        suppressed_at: null,
        email_preferences: { marketing: true },
        is_founding_owner: false,
        last_email_sent_at: null,
      },
      {
        id: 'subscriber-3',
        email: 'guest3@example.com',
        status: 'subscribed',
        tags: ['guest_lead'],
        suppressed_at: '2026-01-02T00:00:00.000Z',
        email_preferences: { marketing: true },
        is_founding_owner: false,
        last_email_sent_at: null,
      },
      {
        id: 'subscriber-4',
        email: 'guest4@example.com',
        status: 'subscribed',
        tags: ['guest_lead'],
        suppressed_at: null,
        email_preferences: { marketing: false },
        is_founding_owner: false,
        last_email_sent_at: null,
      },
      {
        id: 'subscriber-5',
        email: 'bad-email',
        status: 'subscribed',
        tags: ['guest_lead'],
        suppressed_at: null,
        email_preferences: { marketing: true },
        is_founding_owner: false,
        last_email_sent_at: null,
      },
    ];
    state.campaignSubscribers = [];
    state.emailEvents = [];
    state.sendResultsByEmail = new Map();
    state.createOrRotateUnsubscribeToken.mockClear();
    state.sendPlainEmail.mockClear();
  });

  it('resolves audience correctly and excludes unsubscribed, suppressed, marketing=false, and invalid emails', async () => {
    const audience = await resolveNewsletterCampaignAudience({
      client: makeAdminClient() as never,
      segmentSlug: 'guest_leads',
    });

    expect(audience.map((subscriber) => subscriber.id)).toEqual(['subscriber-1']);
  });

  it('inserts snapshot rows, sends to eligible recipients, and updates campaign to sent', async () => {
    const result = await sendNewsletterCampaignNow({
      campaignId: 'campaign-1',
      requestedByEmail: 'admin@pixiedvc.com',
      client: makeAdminClient() as never,
    });

    expect(result).toMatchObject({
      ok: true,
      campaignId: 'campaign-1',
      audienceCount: 1,
      sent: 1,
      skipped: 0,
      failed: 0,
    });
    expect(state.campaign?.status).toBe('sent');
    expect(state.campaign?.sent_at).toBeTruthy();
    expect(state.campaignSubscribers).toEqual([
      expect.objectContaining({ campaign_id: 'campaign-1', subscriber_id: 'subscriber-1', sent_at: expect.any(String) }),
    ]);
    expect(state.sendPlainEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'newsletter_campaign',
        metadata: expect.objectContaining({
          campaign_id: 'campaign-1',
          campaign_name: 'June Newsletter',
          segment_slug: 'guest_leads',
          subscriber_id: 'subscriber-1',
        }),
      }),
    );
    expect(state.subscribers.find((subscriber) => subscriber.id === 'subscriber-1')?.last_email_sent_at).toBeTruthy();
    expect(state.emailEvents).toContainEqual(
      expect.objectContaining({
        subscriber_id: 'subscriber-1',
        event_type: 'newsletter_campaign_sent',
      }),
    );
  });

  it('prevents duplicate send for campaigns that are already sent or locked', async () => {
    state.campaign!.status = 'sent';

    await expect(
      sendNewsletterCampaignNow({
        campaignId: 'campaign-1',
        client: makeAdminClient() as never,
      }),
    ).rejects.toThrow('campaign_not_sendable');
  });

  it('avoids duplicate subscriber sends when snapshot rows already exist with sent_at', async () => {
    state.campaignSubscribers.push({
      campaign_id: 'campaign-1',
      subscriber_id: 'subscriber-1',
      sent_at: '2026-01-05T00:00:00.000Z',
    });

    const result = await sendNewsletterCampaignNow({
      campaignId: 'campaign-1',
      client: makeAdminClient() as never,
    });

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(state.sendPlainEmail).not.toHaveBeenCalled();
  });

  it('handles partial failures without stopping the campaign and still finalizes status', async () => {
    state.subscribers.push({
      id: 'subscriber-6',
      email: 'guest6@example.com',
      status: 'subscribed',
      tags: ['guest_lead'],
      suppressed_at: null,
      email_preferences: { marketing: true },
      is_founding_owner: false,
      last_email_sent_at: null,
    });
    state.sendResultsByEmail.set('guest6@example.com', { status: 'failed' });

    const result = await sendNewsletterCampaignNow({
      campaignId: 'campaign-1',
      client: makeAdminClient() as never,
    });

    expect(result.audienceCount).toBe(2);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.ok).toBe(false);
    expect(state.campaign?.status).toBe('sent');
    expect(state.campaignSubscribers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subscriber_id: 'subscriber-1', sent_at: expect.any(String) }),
        expect.objectContaining({ subscriber_id: 'subscriber-6', sent_at: null }),
      ]),
    );
  });
});

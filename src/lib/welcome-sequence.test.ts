import { beforeEach, describe, expect, it, vi } from 'vitest';

type SubscriberRow = {
  id: string;
  email: string;
  first_name: string | null;
  status: 'subscribed' | 'unsubscribed';
  tags: string[] | null;
  suppressed_at: string | null;
  subscribed_at: string | null;
  welcome_sequence_started_at: string | null;
  welcome_sequence_completed_at: string | null;
  welcome_sequence_step: number | null;
  email_preferences: Record<string, unknown> | null;
  last_email_sent_at?: string | null;
};

type CampaignRow = {
  id: string;
  subject: string;
  preview_text: string | null;
  body_html: string;
  status: string;
  segment_slug: string | null;
};

type CampaignSubscriberRow = {
  campaign_id: string;
  subscriber_id: string;
  sent_at: string | null;
};

type OutboundEmailRow = {
  related_entity_id: string | null;
  related_entity_type: string | null;
  template_key: string;
  status: string;
};

const state = vi.hoisted(() => ({
  subscribers: [] as SubscriberRow[],
  campaigns: [] as CampaignRow[],
  campaignSubscribers: [] as CampaignSubscriberRow[],
  outboundEmails: [] as OutboundEmailRow[],
  events: [] as Array<{ subscriber_id: string; event_type: string; metadata: Record<string, unknown> }>,
  sendResult: { status: 'sent' as const },
  campaignIdCounter: 1,
  getSupabaseAdminClient: vi.fn(),
}));

function filterRows<T extends Record<string, unknown>>(rows: T[], filters: Array<(row: T) => boolean>) {
  return rows.filter((row) => filters.every((filter) => filter(row)));
}

function makeAdminClient() {
  return {
    from: (table: string) => {
      if (table === 'email_subscribers') {
        const filters: Array<(row: SubscriberRow) => boolean> = [];
        return {
          select: () => ({
            eq(column: keyof SubscriberRow, value: unknown) {
              filters.push((row) => row[column] === value);
              return this;
            },
            contains(column: keyof SubscriberRow, value: string[]) {
              filters.push((row) => value.every((item) => (row[column] as string[] | null)?.includes(item)));
              return this;
            },
            order() {
              return this;
            },
            limit: async () => ({
              data: filterRows(state.subscribers, filters),
              error: null,
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: async (_column: string, value: string) => {
              const row = state.subscribers.find((item) => item.id === value);
              if (!row) return { error: { message: 'not found' } };
              Object.assign(row, payload);
              return { error: null };
            },
          }),
        };
      }

      if (table === 'email_campaigns') {
        const filters: Array<(row: CampaignRow) => boolean> = [];
        return {
          select: () => ({
            eq(column: keyof CampaignRow, value: unknown) {
              filters.push((row) => row[column] === value);
              return this;
            },
            limit: async () => ({
              data: filterRows(state.campaigns, filters),
              error: null,
            }),
          }),
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                const row: CampaignRow = {
                  id: `campaign-${state.campaignIdCounter++}`,
                  subject: String(payload.subject),
                  preview_text: (payload.preview_text as string | null) ?? null,
                  body_html: String(payload.body_html),
                  status: String(payload.status),
                  segment_slug: (payload.segment_slug as string | null) ?? null,
                };
                state.campaigns.push(row);
                return { data: row, error: null };
              },
            }),
          }),
        };
      }

      if (table === 'outbound_emails') {
        const filters: Array<(row: OutboundEmailRow) => boolean> = [];
        const query = {
          eq(column: keyof OutboundEmailRow, value: unknown) {
            filters.push((row) => row[column] === value);
            return query;
          },
          in(column: keyof OutboundEmailRow, values: unknown[]) {
            filters.push((row) => values.includes(row[column]));
            return query;
          },
          then(resolve: (value: { data: OutboundEmailRow[]; error: null }) => void) {
            resolve({
              data: filterRows(state.outboundEmails, filters),
              error: null,
            });
          },
        };
        return {
          select: () => query,
        };
      }

      if (table === 'email_campaign_subscribers') {
        return {
          upsert: async (payload: Record<string, unknown>) => {
            const existing = state.campaignSubscribers.find(
              (row) =>
                row.campaign_id === payload.campaign_id &&
                row.subscriber_id === payload.subscriber_id,
            );
            if (!existing) {
              state.campaignSubscribers.push({
                campaign_id: String(payload.campaign_id),
                subscriber_id: String(payload.subscriber_id),
                sent_at: null,
              });
            }
            return { error: null };
          },
          update: (payload: Record<string, unknown>) => ({
            eq(column: keyof CampaignSubscriberRow, value: unknown) {
              const filters: Array<(row: CampaignSubscriberRow) => boolean> = [(row) => row[column] === value];
              return {
                eq: async (column2: keyof CampaignSubscriberRow, value2: unknown) => {
                  const row = state.campaignSubscribers.find(
                    (item) => filters.every((filter) => filter(item)) && item[column2] === value2,
                  );
                  if (!row) return { error: { message: 'not found' } };
                  Object.assign(row, payload);
                  return { error: null };
                },
              };
            },
          }),
        };
      }

      if (table === 'email_events') {
        return {
          insert: async (payload: Record<string, unknown>) => {
            state.events.push({
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

vi.mock('@/lib/email', () => ({
  sendWelcomeSequenceEmail: vi.fn(async () => state.sendResult),
}));

vi.mock('@/lib/email-subscribers', () => ({
  createOrRotateUnsubscribeToken: vi.fn(async (subscriberId: string) => ({
    token: `unsubscribe-${subscriberId}`,
    tokenHash: `hash-${subscriberId}`,
  })),
  buildUnsubscribeUrl: vi.fn((token: string) => `https://pixiedvc.test/unsubscribe/${token}`),
}));

vi.mock('@/lib/app-url', () => ({
  getAppUrl: vi.fn((path: string) => `https://pixiedvc.test${path}`),
}));

import { runWelcomeSequence } from '@/lib/welcome-sequence';

describe('runWelcomeSequence', () => {
  beforeEach(() => {
    state.subscribers.length = 0;
    state.campaigns.length = 0;
    state.campaignSubscribers.length = 0;
    state.outboundEmails.length = 0;
    state.events.length = 0;
    state.sendResult = { status: 'sent' };
    state.campaignIdCounter = 1;
  });

  it('sends day 0 welcome email and advances subscriber progress', async () => {
    state.subscribers.push({
      id: 'subscriber-1',
      email: 'guest@example.com',
      first_name: 'Guest',
      status: 'subscribed',
      tags: ['newsletter_subscriber', 'guest_lead'],
      suppressed_at: null,
      subscribed_at: '2026-01-01T00:00:00.000Z',
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      email_preferences: { marketing: true },
      last_email_sent_at: null,
    });

    const now = new Date('2026-01-01T12:00:00.000Z');
    const result = await runWelcomeSequence({ client: makeAdminClient() as never, now });

    expect(result.ok).toBe(true);
    expect(result.sent).toBe(1);
    expect(state.subscribers[0]?.welcome_sequence_step).toBe(0);
    expect(state.subscribers[0]?.welcome_sequence_started_at).toBe(now.toISOString());
    expect(state.subscribers[0]?.last_email_sent_at).toBe(now.toISOString());
    expect(state.campaigns).toHaveLength(6);
    expect(state.campaignSubscribers[0]).toMatchObject({
      subscriber_id: 'subscriber-1',
      sent_at: now.toISOString(),
    });
    expect(state.events.at(-1)).toMatchObject({
      subscriber_id: 'subscriber-1',
      event_type: 'welcome_sequence_sent',
      metadata: expect.objectContaining({ step: 0, template_key: 'welcome_sequence_day_0' }),
    });
  });

  it('skips already sent steps using outbound email logs', async () => {
    state.subscribers.push({
      id: 'subscriber-1',
      email: 'guest@example.com',
      first_name: null,
      status: 'subscribed',
      tags: ['newsletter_subscriber'],
      suppressed_at: null,
      subscribed_at: '2026-01-01T00:00:00.000Z',
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      email_preferences: { marketing: true },
      last_email_sent_at: null,
    });
    state.outboundEmails.push({
      related_entity_id: 'subscriber-1',
      related_entity_type: 'email_subscriber',
      template_key: 'welcome_sequence_day_0',
      status: 'sent',
    });

    const result = await runWelcomeSequence({
      client: makeAdminClient() as never,
      now: new Date('2026-01-01T12:00:00.000Z'),
    });

    expect(result.sent).toBe(0);
    expect(result.skipped).toContainEqual({ subscriberId: 'subscriber-1', reason: 'already_sent' });
  });

  it('does not send to unsubscribed or suppressed subscribers', async () => {
    state.subscribers.push({
      id: 'subscriber-1',
      email: 'unsub@example.com',
      first_name: null,
      status: 'unsubscribed',
      tags: ['newsletter_subscriber'],
      suppressed_at: null,
      subscribed_at: '2026-01-01T00:00:00.000Z',
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      email_preferences: { marketing: false },
      last_email_sent_at: null,
    });
    state.subscribers.push({
      id: 'subscriber-2',
      email: 'suppressed@example.com',
      first_name: null,
      status: 'subscribed',
      tags: ['newsletter_subscriber'],
      suppressed_at: '2026-01-01T00:00:00.000Z',
      subscribed_at: '2026-01-01T00:00:00.000Z',
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      email_preferences: { marketing: true },
      last_email_sent_at: null,
    });

    const result = await runWelcomeSequence({
      client: makeAdminClient() as never,
      now: new Date('2026-01-02T12:00:00.000Z'),
    });

    expect(result.candidates).toBe(0);
    expect(result.sent).toBe(0);
  });
});

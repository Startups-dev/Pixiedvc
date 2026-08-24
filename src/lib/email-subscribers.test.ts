import { beforeEach, describe, expect, it, vi } from 'vitest';

type SubscriberRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  status: 'subscribed' | 'unsubscribed';
  source: string | null;
  country: string | null;
  tags: string[];
  email_preferences: Record<string, unknown> | null;
  is_founding_owner: boolean;
  bounce_count: number | null;
  last_bounced_at: string | null;
  suppressed_at: string | null;
  suppression_reason: string | null;
  last_email_sent_at: string | null;
  last_opened_at: string | null;
  last_clicked_at: string | null;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  welcome_sequence_started_at: string | null;
  welcome_sequence_completed_at: string | null;
  welcome_sequence_step: number | null;
  unsubscribe_token_hash: string | null;
  unsubscribe_token_created_at: string | null;
  unsubscribe_token_rotated_at: string | null;
};

type OwnerRow = {
  id: string;
  user_id: string | null;
  verification: string | null;
  founding_owner_bonus_cents_per_point: number | null;
  founding_owner_bonus_started_at: string | null;
  founding_owner_bonus_expires_at: string | null;
  founding_owner_granted_at: string | null;
  founding_owner_promotion_id: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
};

const subscriberState = vi.hoisted(() => ({
  subscribersByEmail: new Map<string, SubscriberRow>(),
  ownersByIdOrUserId: new Map<string, OwnerRow>(),
  profilesByEmail: new Map<string, ProfileRow>(),
  events: [] as Array<{ subscriber_id: string; event_type: string; metadata: Record<string, unknown> }>,
  ownerSelects: [] as string[],
  idCounter: 1,
  getSupabaseAdminClient: vi.fn(),
}));

function makeAdminClient() {
  return {
    from: (table: string) => {
      if (table === 'email_subscribers') {
        const findByColumn = (column: string, value: string) => {
          if (column === 'email') {
            return subscriberState.subscribersByEmail.get(value) ?? null;
          }
          if (column === 'id') {
            return Array.from(subscriberState.subscribersByEmail.values()).find((item) => item.id === value) ?? null;
          }
          if (column === 'unsubscribe_token_hash') {
            return (
              Array.from(subscriberState.subscribersByEmail.values()).find(
                (item) => item.unsubscribe_token_hash === value,
              ) ?? null
            );
          }
          return null;
        };

        return {
          select: () => ({
            eq: (column: string, value: string) => ({
              maybeSingle: async () => ({
                data: findByColumn(column, value),
                error: null,
              }),
            }),
          }),
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                const id = `subscriber-${subscriberState.idCounter++}`;
                const row: SubscriberRow = {
                  id,
                  email: String(payload.email),
                  first_name: (payload.first_name as string | null) ?? null,
                  last_name: (payload.last_name as string | null) ?? null,
                  user_id: (payload.user_id as string | null) ?? null,
                  status: (payload.status as SubscriberRow['status']) ?? 'subscribed',
                  source: (payload.source as string | null) ?? null,
                  country: (payload.country as string | null) ?? null,
                  tags: ((payload.tags as string[] | null) ?? []).slice(),
                  email_preferences: (payload.email_preferences as Record<string, unknown> | null) ?? null,
                  is_founding_owner: Boolean(payload.is_founding_owner),
                  bounce_count: (payload.bounce_count as number | null) ?? 0,
                  last_bounced_at: (payload.last_bounced_at as string | null) ?? null,
                  suppressed_at: (payload.suppressed_at as string | null) ?? null,
                  suppression_reason: (payload.suppression_reason as string | null) ?? null,
                  last_email_sent_at: (payload.last_email_sent_at as string | null) ?? null,
                  last_opened_at: (payload.last_opened_at as string | null) ?? null,
                  last_clicked_at: (payload.last_clicked_at as string | null) ?? null,
                  subscribed_at: (payload.subscribed_at as string | null) ?? null,
                  unsubscribed_at: (payload.unsubscribed_at as string | null) ?? null,
                  welcome_sequence_started_at: (payload.welcome_sequence_started_at as string | null) ?? null,
                  welcome_sequence_completed_at: (payload.welcome_sequence_completed_at as string | null) ?? null,
                  welcome_sequence_step: (payload.welcome_sequence_step as number | null) ?? null,
                  unsubscribe_token_hash: (payload.unsubscribe_token_hash as string | null) ?? null,
                  unsubscribe_token_created_at: (payload.unsubscribe_token_created_at as string | null) ?? null,
                  unsubscribe_token_rotated_at: (payload.unsubscribe_token_rotated_at as string | null) ?? null,
                };
                subscriberState.subscribersByEmail.set(row.email, row);
                return { data: row, error: null };
              },
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: (column: string, value: string) => {
              const applyUpdate = async () => {
                const row = findByColumn(column, value);
                if (!row) {
                  return { data: null, error: { message: 'not found' } };
                }
                const next = {
                  ...row,
                  ...payload,
                  tags: (payload.tags as string[] | undefined) ?? row.tags,
                  email_preferences:
                    (payload.email_preferences as Record<string, unknown> | undefined) ?? row.email_preferences,
                } as SubscriberRow;
                subscriberState.subscribersByEmail.set(next.email, next);
                return { data: next, error: null };
              };

              return {
                select: () => ({
                  single: applyUpdate,
                }),
                then: (resolve: (value: { error: { message: string } | null }) => void, reject?: (reason: unknown) => void) =>
                  applyUpdate()
                    .then(({ error }) => resolve({ error }))
                    .catch((reason) => reject?.(reason)),
              } as PromiseLike<{ error: { message: string } | null }> & {
                select: () => { single: typeof applyUpdate };
              };
            },
          }),
        };
      }

      if (table === 'owners') {
        return {
          select: (columns: string) => {
            subscriberState.ownerSelects.push(columns);
            if (columns.includes('email')) {
              return {
                or: () => ({
                  maybeSingle: async () => ({
                    data: null,
                    error: { message: 'column owners.email does not exist' },
                  }),
                }),
                eq: () => ({
                  maybeSingle: async () => ({
                    data: null,
                    error: { message: 'column owners.email does not exist' },
                  }),
                }),
              };
            }
            return {
              or: (_expression: string) => ({
                maybeSingle: async () => {
                  const expression = _expression;
                  const values = expression
                    .split(',')
                    .map((part) => part.split('.eq.')[1])
                    .filter(Boolean);

                  const owner =
                    values
                      .map((value) => subscriberState.ownersByIdOrUserId.get(String(value)))
                      .find(Boolean) ?? null;

                  return {
                    data: owner,
                    error: null,
                  };
                },
              }),
              eq: (_column: string, value: string) => ({
                maybeSingle: async () => ({
                  data: subscriberState.ownersByIdOrUserId.get(value) ?? null,
                  error: null,
                }),
              }),
            };
          },
        };
      }

      if (table === 'profiles') {
        return {
          select: () => ({
            eq: (_column: string, value: string) => ({
              maybeSingle: async () => ({
                data: subscriberState.profilesByEmail.get(value) ?? null,
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'email_events') {
        return {
          insert: async (payload: Record<string, unknown>) => {
            subscriberState.events.push({
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

subscriberState.getSupabaseAdminClient.mockImplementation(() => makeAdminClient());

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: subscriberState.getSupabaseAdminClient,
}));

import { addSubscriberTag, ingestSubscriber, removeSubscriberTag, subscribeEmail, suppressSubscriberMarketing, unsubscribeEmail } from '@/lib/email-subscribers';
import {
  buildUnsubscribeUrl,
  createOrRotateUnsubscribeToken,
  generateUnsubscribeToken,
  getSubscriberByUnsubscribeToken,
  hashUnsubscribeToken,
  unsubscribeByToken,
  updateSubscriberPreferencesByToken,
} from '@/lib/email-subscribers';

describe('email subscriber helpers', () => {
  beforeEach(() => {
    subscriberState.subscribersByEmail.clear();
    subscriberState.ownersByIdOrUserId.clear();
    subscriberState.profilesByEmail.clear();
    subscriberState.events.length = 0;
    subscriberState.ownerSelects.length = 0;
    subscriberState.idCounter = 1;
    subscriberState.getSupabaseAdminClient.mockClear();
    subscriberState.getSupabaseAdminClient.mockImplementation(() => makeAdminClient());
  });

  it('creates a new subscriber and records a subscribed event', async () => {
    const row = await subscribeEmail({
      email: 'Guest@Example.com ',
      source: 'hero_bar',
      tags: ['guest_lead', 'guest_lead'],
      firstName: 'Guest',
    });

    expect(row.email).toBe('guest@example.com');
    expect(row.status).toBe('subscribed');
    expect(row.tags).toEqual(['guest_lead']);
    expect(subscriberState.subscribersByEmail.get('guest@example.com')?.unsubscribe_token_hash).toBeTruthy();
    expect(subscriberState.events[0]).toMatchObject({
      event_type: 'subscribed',
      metadata: { source: 'hero_bar', tags: ['guest_lead'], explicit_consent: true, owner_matched: false },
    });
  });

  it('does not mark a normal guest subscriber as a founding owner', async () => {
    const row = await subscribeEmail({
      email: 'guest@example.com',
      source: 'hero_bar',
      tags: ['newsletter_subscriber'],
    });

    expect(row.is_founding_owner).toBe(false);
    expect(row.tags).toEqual(['newsletter_subscriber']);
  });

  it('marks a founding owner matched by profile email with founding_owner and verified_owner tags', async () => {
    subscriberState.profilesByEmail.set('founder@example.com', {
      id: 'user-1',
      email: 'founder@example.com',
    });
    subscriberState.ownersByIdOrUserId.set('user-1', {
      id: 'owner-1',
      user_id: 'user-1',
      verification: 'verified',
      founding_owner_bonus_cents_per_point: 200,
      founding_owner_bonus_started_at: '2026-01-01T00:00:00.000Z',
      founding_owner_bonus_expires_at: '2028-01-01T00:00:00.000Z',
      founding_owner_granted_at: '2026-01-01T00:00:00.000Z',
      founding_owner_promotion_id: 'promo-1',
    });

    const row = await subscribeEmail({
      email: 'Founder@Example.com',
      tags: ['newsletter_subscriber'],
    });

    expect(row.is_founding_owner).toBe(true);
    expect(row.tags).toEqual(['newsletter_subscriber', 'founding_owner', 'owner_lead', 'verified_owner']);
    expect(subscriberState.ownerSelects.some((columns) => columns.includes('email'))).toBe(false);
  });

  it('updates an existing subscriber when the email is later identified as a founding owner', async () => {
    subscriberState.subscribersByEmail.set('founder@example.com', {
      id: 'subscriber-1',
      email: 'founder@example.com',
      first_name: null,
      last_name: null,
      user_id: null,
      status: 'subscribed',
      source: 'hero_bar',
      country: null,
      tags: ['newsletter_subscriber'],
      email_preferences: { marketing: true },
      is_founding_owner: false,
      bounce_count: 0,
      last_bounced_at: null,
      suppressed_at: null,
      suppression_reason: null,
      last_email_sent_at: null,
      last_opened_at: null,
      last_clicked_at: null,
      subscribed_at: '2026-01-01T00:00:00.000Z',
      unsubscribed_at: null,
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      unsubscribe_token_hash: hashUnsubscribeToken('seed-token'),
      unsubscribe_token_created_at: '2026-01-01T00:00:00.000Z',
      unsubscribe_token_rotated_at: '2026-01-01T00:00:00.000Z',
    });
    subscriberState.profilesByEmail.set('founder@example.com', {
      id: 'user-legacy',
      email: 'founder@example.com',
    });
    subscriberState.ownersByIdOrUserId.set('user-legacy', {
      id: 'owner-legacy',
      user_id: 'user-legacy',
      verification: 'verified',
      founding_owner_bonus_cents_per_point: 200,
      founding_owner_bonus_started_at: '2026-01-01T00:00:00.000Z',
      founding_owner_bonus_expires_at: '2028-01-01T00:00:00.000Z',
      founding_owner_granted_at: '2026-01-01T00:00:00.000Z',
      founding_owner_promotion_id: 'promo-legacy',
    });

    const row = await ingestSubscriber({
      email: 'founder@example.com',
      tags: ['newsletter_subscriber'],
      explicitConsent: false,
    });

    expect(row.is_founding_owner).toBe(true);
    expect(row.tags).toEqual(['founding_owner', 'newsletter_subscriber', 'owner_lead', 'verified_owner']);
  });

  it('does not silently resubscribe an unsubscribed subscriber without explicit consent', async () => {
    subscriberState.subscribersByEmail.set('guest@example.com', {
      id: 'subscriber-1',
      email: 'guest@example.com',
      first_name: null,
      last_name: null,
      user_id: null,
      status: 'unsubscribed',
      source: 'bottom_cta',
      country: null,
      tags: ['guest_lead'],
      email_preferences: { marketing: false },
      is_founding_owner: false,
      bounce_count: 0,
      last_bounced_at: null,
      suppressed_at: null,
      suppression_reason: null,
      last_email_sent_at: null,
      last_opened_at: null,
      last_clicked_at: null,
      subscribed_at: '2026-01-01T00:00:00.000Z',
      unsubscribed_at: '2026-01-02T00:00:00.000Z',
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      unsubscribe_token_hash: hashUnsubscribeToken('seed-token'),
      unsubscribe_token_created_at: '2026-01-01T00:00:00.000Z',
      unsubscribe_token_rotated_at: '2026-01-01T00:00:00.000Z',
    });

    const row = await ingestSubscriber({
      email: 'guest@example.com',
      source: 'last_minute_unlock',
      tags: ['liquidation_lead', 'newsletter_subscriber'],
      explicitConsent: false,
      emailPreferences: { marketing: true },
    });

    expect(row.status).toBe('unsubscribed');
    expect(row.email_preferences).toEqual({ marketing: false });
    expect(row.tags).toEqual(['guest_lead', 'liquidation_lead', 'newsletter_subscriber']);
    expect(subscriberState.events.at(-1)).toMatchObject({
      event_type: 'subscriber_ingested',
      metadata: {
        source: 'last_minute_unlock',
        explicit_consent: false,
      },
    });
  });

  it('does not silently resubscribe an unsubscribed founding owner but safely updates founder metadata and tags', async () => {
    subscriberState.subscribersByEmail.set('founder@example.com', {
      id: 'subscriber-1',
      email: 'founder@example.com',
      first_name: null,
      last_name: null,
      user_id: null,
      status: 'unsubscribed',
      source: 'hero_bar',
      country: null,
      tags: ['newsletter_subscriber'],
      email_preferences: { marketing: false },
      is_founding_owner: false,
      bounce_count: 0,
      last_bounced_at: null,
      suppressed_at: null,
      suppression_reason: null,
      last_email_sent_at: null,
      last_opened_at: null,
      last_clicked_at: null,
      subscribed_at: '2026-01-01T00:00:00.000Z',
      unsubscribed_at: '2026-01-02T00:00:00.000Z',
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      unsubscribe_token_hash: hashUnsubscribeToken('seed-token'),
      unsubscribe_token_created_at: '2026-01-01T00:00:00.000Z',
      unsubscribe_token_rotated_at: '2026-01-01T00:00:00.000Z',
    });
    subscriberState.profilesByEmail.set('founder@example.com', {
      id: 'user-legacy',
      email: 'founder@example.com',
    });
    subscriberState.ownersByIdOrUserId.set('user-legacy', {
      id: 'owner-legacy',
      user_id: 'user-legacy',
      verification: 'verified',
      founding_owner_bonus_cents_per_point: 200,
      founding_owner_bonus_started_at: '2026-01-01T00:00:00.000Z',
      founding_owner_bonus_expires_at: '2028-01-01T00:00:00.000Z',
      founding_owner_granted_at: '2026-01-01T00:00:00.000Z',
      founding_owner_promotion_id: 'promo-legacy',
    });

    const row = await ingestSubscriber({
      email: 'founder@example.com',
      source: 'homepage',
      explicitConsent: false,
    });

    expect(row.status).toBe('unsubscribed');
    expect(row.is_founding_owner).toBe(true);
    expect(row.tags).toEqual(['founding_owner', 'newsletter_subscriber', 'owner_lead', 'verified_owner']);
    expect(row.email_preferences).toEqual({ marketing: false });
  });

  it('resubscribes an unsubscribed subscriber and merges tags', async () => {
    subscriberState.subscribersByEmail.set('owner@example.com', {
      id: 'subscriber-1',
      email: 'owner@example.com',
      first_name: 'Owner',
      last_name: null,
      user_id: null,
      status: 'unsubscribed',
      source: 'bottom_cta',
      country: null,
      tags: ['owner_lead'],
      email_preferences: { marketing: false },
      is_founding_owner: false,
      bounce_count: 0,
      last_bounced_at: null,
      suppressed_at: null,
      suppression_reason: null,
      last_email_sent_at: null,
      last_opened_at: null,
      last_clicked_at: null,
      subscribed_at: null,
      unsubscribed_at: '2026-01-01T00:00:00.000Z',
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      unsubscribe_token_hash: null,
      unsubscribe_token_created_at: null,
      unsubscribe_token_rotated_at: null,
    });

    const row = await subscribeEmail({
      email: 'owner@example.com',
      tags: ['founding_owner'],
      isFoundingOwner: true,
    });

    expect(row.status).toBe('subscribed');
    expect(row.tags).toEqual(['founding_owner', 'owner_lead']);
    expect(row.is_founding_owner).toBe(true);
    expect(row.email_preferences).toEqual({ marketing: true });
    expect(row.unsubscribe_token_hash).toBeTruthy();
    expect(subscriberState.events.at(-1)).toMatchObject({ event_type: 'resubscribed' });
  });

  it('unsubscribes a subscriber and records an event', async () => {
    subscriberState.subscribersByEmail.set('guest@example.com', {
      id: 'subscriber-1',
      email: 'guest@example.com',
      first_name: null,
      last_name: null,
      user_id: null,
      status: 'subscribed',
      source: 'hero_bar',
      country: null,
      tags: [],
      email_preferences: { marketing: true },
      is_founding_owner: false,
      bounce_count: 0,
      last_bounced_at: null,
      suppressed_at: null,
      suppression_reason: null,
      last_email_sent_at: null,
      last_opened_at: null,
      last_clicked_at: null,
      subscribed_at: '2026-01-01T00:00:00.000Z',
      unsubscribed_at: null,
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      unsubscribe_token_hash: hashUnsubscribeToken('seed-token'),
      unsubscribe_token_created_at: '2026-01-01T00:00:00.000Z',
      unsubscribe_token_rotated_at: '2026-01-01T00:00:00.000Z',
    });

    const row = await unsubscribeEmail({ email: 'guest@example.com' });

    expect(row?.status).toBe('unsubscribed');
    expect(row?.email_preferences).toEqual({ marketing: false });
    expect(subscriberState.events.at(-1)).toMatchObject({ event_type: 'unsubscribed' });
  });

  it('suppresses owner marketing without deleting the subscriber record', async () => {
    subscriberState.subscribersByEmail.set('owner@example.com', {
      id: 'subscriber-1',
      email: 'owner@example.com',
      first_name: 'Owner',
      last_name: null,
      user_id: 'owner-user-1',
      status: 'subscribed',
      source: 'owner_onboarding',
      country: null,
      tags: ['owner_lead', 'newsletter_subscriber'],
      email_preferences: { marketing: true },
      is_founding_owner: false,
      bounce_count: 0,
      last_bounced_at: null,
      suppressed_at: null,
      suppression_reason: null,
      last_email_sent_at: null,
      last_opened_at: null,
      last_clicked_at: null,
      subscribed_at: '2026-01-01T00:00:00.000Z',
      unsubscribed_at: null,
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      unsubscribe_token_hash: hashUnsubscribeToken('seed-token'),
      unsubscribe_token_created_at: '2026-01-01T00:00:00.000Z',
      unsubscribe_token_rotated_at: '2026-01-01T00:00:00.000Z',
    });

    const row = await suppressSubscriberMarketing({
      email: 'owner@example.com',
      reason: 'owner_account_deactivated',
    });

    expect(row?.status).toBe('unsubscribed');
    expect(row?.email_preferences).toEqual({ marketing: false });
    expect(row?.suppressed_at).toEqual(expect.any(String));
    expect(row?.suppression_reason).toBe('owner_account_deactivated');
    expect(subscriberState.subscribersByEmail.has('owner@example.com')).toBe(true);
    expect(subscriberState.events.at(-1)).toMatchObject({
      event_type: 'marketing_suppressed',
      metadata: { reason: 'owner_account_deactivated' },
    });
  });

  it('adds and removes tags while logging events', async () => {
    subscriberState.subscribersByEmail.set('guest@example.com', {
      id: 'subscriber-1',
      email: 'guest@example.com',
      first_name: null,
      last_name: null,
      user_id: null,
      status: 'subscribed',
      source: 'hero_bar',
      country: null,
      tags: ['guest_lead'],
      email_preferences: { marketing: true },
      is_founding_owner: false,
      bounce_count: 0,
      last_bounced_at: null,
      suppressed_at: null,
      suppression_reason: null,
      last_email_sent_at: null,
      last_opened_at: null,
      last_clicked_at: null,
      subscribed_at: '2026-01-01T00:00:00.000Z',
      unsubscribed_at: null,
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      unsubscribe_token_hash: hashUnsubscribeToken('seed-token'),
      unsubscribe_token_created_at: '2026-01-01T00:00:00.000Z',
      unsubscribe_token_rotated_at: '2026-01-01T00:00:00.000Z',
    });

    const added = await addSubscriberTag({ email: 'guest@example.com', tag: 'ready_stay_alerts' });
    expect(added.tags).toEqual(['guest_lead', 'ready_stay_alerts']);

    const removed = await removeSubscriberTag({ email: 'guest@example.com', tag: 'guest_lead' });
    expect(removed.tags).toEqual(['ready_stay_alerts']);
    expect(subscriberState.events.map((event) => event.event_type)).toEqual(['tag_added', 'tag_removed']);
  });

  it('generates and hashes unsubscribe tokens', () => {
    const token = generateUnsubscribeToken();
    expect(token.length).toBeGreaterThan(20);
    expect(hashUnsubscribeToken(token)).toHaveLength(64);
  });

  it('builds unsubscribe urls with the shared app url helper', () => {
    process.env.APP_BASE_URL = 'https://pixiedvc.com';
    expect(buildUnsubscribeUrl('token-123')).toBe('https://pixiedvc.com/unsubscribe/token-123');
  });

  it('looks up, unsubscribes, and updates preferences by token', async () => {
    const token = 'token-123';
    subscriberState.subscribersByEmail.set('guest@example.com', {
      id: 'subscriber-1',
      email: 'guest@example.com',
      first_name: null,
      last_name: null,
      user_id: null,
      status: 'subscribed',
      source: 'hero_bar',
      country: null,
      tags: ['guest_lead'],
      email_preferences: { marketing: true },
      is_founding_owner: false,
      bounce_count: 0,
      last_bounced_at: null,
      suppressed_at: null,
      suppression_reason: null,
      last_email_sent_at: null,
      last_opened_at: null,
      last_clicked_at: null,
      subscribed_at: '2026-01-01T00:00:00.000Z',
      unsubscribed_at: null,
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      unsubscribe_token_hash: hashUnsubscribeToken(token),
      unsubscribe_token_created_at: '2026-01-01T00:00:00.000Z',
      unsubscribe_token_rotated_at: '2026-01-01T00:00:00.000Z',
    });

    const found = await getSubscriberByUnsubscribeToken(token);
    expect(found?.email).toBe('guest@example.com');

    const unsubscribed = await unsubscribeByToken(token);
    expect(unsubscribed.ok).toBe(true);
    expect(unsubscribed.reason).toBe('unsubscribed');

    const updated = await updateSubscriberPreferencesByToken({
      token,
      preferences: { marketing: true, ready_stay_alerts: true },
    });
    expect(updated.ok).toBe(true);
    expect(updated.subscriber?.status).toBe('subscribed');
    expect(updated.subscriber?.email_preferences).toEqual({ marketing: true, ready_stay_alerts: true });
  });

  it('returns invalid_token for bad unsubscribe tokens', async () => {
    const result = await unsubscribeByToken('missing-token');
    expect(result).toMatchObject({ ok: false, reason: 'invalid_token' });
  });

  it('rotates unsubscribe tokens for an existing subscriber', async () => {
    subscriberState.subscribersByEmail.set('guest@example.com', {
      id: 'subscriber-1',
      email: 'guest@example.com',
      first_name: null,
      last_name: null,
      user_id: null,
      status: 'subscribed',
      source: 'hero_bar',
      country: null,
      tags: [],
      email_preferences: { marketing: true },
      is_founding_owner: false,
      bounce_count: 0,
      last_bounced_at: null,
      suppressed_at: null,
      suppression_reason: null,
      last_email_sent_at: null,
      last_opened_at: null,
      last_clicked_at: null,
      subscribed_at: '2026-01-01T00:00:00.000Z',
      unsubscribed_at: null,
      welcome_sequence_started_at: null,
      welcome_sequence_completed_at: null,
      welcome_sequence_step: null,
      unsubscribe_token_hash: null,
      unsubscribe_token_created_at: null,
      unsubscribe_token_rotated_at: null,
    });

    const result = await createOrRotateUnsubscribeToken('subscriber-1');
    expect(result.token).toBeTruthy();
    expect(subscriberState.subscribersByEmail.get('guest@example.com')?.unsubscribe_token_hash).toBe(result.tokenHash);
  });
});

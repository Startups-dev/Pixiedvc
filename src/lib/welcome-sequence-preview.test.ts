import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  subscriberId: null as string | null,
  sendResult: { status: 'sent' as const },
  getSupabaseAdminClient: vi.fn(),
  createOrRotateUnsubscribeToken: vi.fn(async (subscriberId: string) => ({
    token: `token-${subscriberId}`,
    tokenHash: `hash-${subscriberId}`,
  })),
  buildUnsubscribeUrl: vi.fn((token: string) => `https://pixiedvc.test/unsubscribe/${token}`),
  sendWelcomeSequenceEmail: vi.fn(async (payload: Record<string, unknown>) => ({
    ...state.sendResult,
    payload,
  })),
}));

function makeAdminClient() {
  return {
    from: (table: string) => {
      if (table === 'email_subscribers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: state.subscriberId ? { id: state.subscriberId } : null,
                error: null,
              }),
            }),
          }),
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
  sendWelcomeSequenceEmail: state.sendWelcomeSequenceEmail,
}));

vi.mock('@/lib/app-url', () => ({
  getAppUrl: vi.fn((path: string) => `https://pixiedvc.test${path}`),
}));

import { buildWelcomeSequencePreviewCards, sendWelcomeSequenceTestEmail } from '@/lib/welcome-sequence-preview';

describe('welcome sequence preview tooling', () => {
  beforeEach(() => {
    state.subscriberId = null;
    state.sendResult = { status: 'sent' };
    state.createOrRotateUnsubscribeToken.mockClear();
    state.buildUnsubscribeUrl.mockClear();
    state.sendWelcomeSequenceEmail.mockClear();
  });

  it('builds preview cards for all six welcome sequence emails', () => {
    const cards = buildWelcomeSequencePreviewCards();

    expect(cards).toHaveLength(6);
    expect(cards.map((card) => card.step)).toEqual([0, 3, 7, 14, 21, 30]);
    expect(cards[0]?.subject).toBe('Welcome to PixieDVC');
    expect(cards[5]?.subject).toBe('Your PixieDVC Insider Access Continues');
  });

  it('sends a test email without requiring a real subscriber record', async () => {
    const result = await sendWelcomeSequenceTestEmail({
      email: 'Admin@Test.com',
      step: 14,
      requestedByEmail: 'owner@pixiedvc.com',
      client: makeAdminClient() as never,
    });

    expect(result).toMatchObject({ ok: true, email: 'admin@test.com', step: 14 });
    expect(state.createOrRotateUnsubscribeToken).not.toHaveBeenCalled();
    expect(state.sendWelcomeSequenceEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@test.com',
        step: 14,
        templateKey: 'welcome_sequence_day_14_test',
        relatedEntityType: 'admin_welcome_sequence_preview',
        metadata: expect.objectContaining({
          is_test: true,
          preview_tool: true,
          requested_by_email: 'owner@pixiedvc.com',
          original_template_key: 'welcome_sequence_day_14',
        }),
      }),
    );
  });

  it('uses a real unsubscribe token when the recipient is already a subscriber', async () => {
    state.subscriberId = 'subscriber-1';

    await sendWelcomeSequenceTestEmail({
      email: 'guest@example.com',
      step: 0,
      client: makeAdminClient() as never,
    });

    expect(state.createOrRotateUnsubscribeToken).toHaveBeenCalledWith('subscriber-1', expect.any(Object));
    expect(state.sendWelcomeSequenceEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        unsubscribeUrl: 'https://pixiedvc.test/unsubscribe/token-subscriber-1',
      }),
    );
  });
});

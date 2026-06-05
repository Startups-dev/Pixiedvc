import { beforeEach, describe, expect, it, vi } from 'vitest';

type CampaignRow = {
  id: string;
  subject: string;
  preview_text: string | null;
  content_json: Record<string, unknown> | null;
  status: string;
};

const state = vi.hoisted(() => ({
  campaign: null as CampaignRow | null,
  subscriberId: null as string | null,
  sendResult: { status: 'sent' as const },
  getSupabaseAdminClient: vi.fn(),
  createOrRotateUnsubscribeToken: vi.fn(async (subscriberId: string) => ({
    token: `token-${subscriberId}`,
    tokenHash: `hash-${subscriberId}`,
  })),
  buildUnsubscribeUrl: vi.fn((token: string) => `https://pixiedvc.test/unsubscribe/${token}`),
  sendPlainEmail: vi.fn(async (payload: Record<string, unknown>) => ({
    ...state.sendResult,
    payload,
  })),
  touchedTables: [] as string[],
}));

function makeAdminClient() {
  return {
    from: (table: string) => {
      state.touchedTables.push(table);

      if (table === 'email_campaigns') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: state.campaign,
                error: null,
              }),
            }),
          }),
        };
      }

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
  sendPlainEmail: state.sendPlainEmail,
}));

import { sendNewsletterCampaignTestEmail } from '@/lib/newsletter-campaign-test-send';

describe('sendNewsletterCampaignTestEmail', () => {
  beforeEach(() => {
    state.campaign = {
      id: 'campaign-1',
      subject: 'Disney Villa Highlights',
      preview_text: 'Fresh inventory and resort guides.',
      content_json: {
        body_sections: [{ title: 'Featured', content: 'New villas are live.' }],
        primary_cta_label: 'Browse Ready Stays',
        primary_cta_url: 'https://pixiedvc.test/ready-stays',
      },
      status: 'draft',
    };
    state.subscriberId = null;
    state.sendResult = { status: 'sent' };
    state.touchedTables.length = 0;
    state.createOrRotateUnsubscribeToken.mockClear();
    state.sendPlainEmail.mockClear();
  });

  it('sends a successful test email with test metadata', async () => {
    const result = await sendNewsletterCampaignTestEmail({
      campaignId: 'campaign-1',
      email: 'Admin@Test.com',
      requestedByEmail: 'owner@pixiedvc.com',
      client: makeAdminClient() as never,
    });

    expect(result).toMatchObject({
      ok: true,
      campaignId: 'campaign-1',
      email: 'admin@test.com',
    });
    expect(state.sendPlainEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@test.com',
        subject: 'Disney Villa Highlights',
        templateKey: 'newsletter_campaign_test',
        relatedEntityType: 'email_campaign',
        relatedEntityId: 'campaign-1',
        metadata: expect.objectContaining({
          is_test: true,
          campaign_id: 'campaign-1',
          requested_by_email: 'owner@pixiedvc.com',
          preview_tool: true,
        }),
      }),
    );
  });

  it('uses a real unsubscribe token for an existing subscriber and does not touch campaign subscribers', async () => {
    state.subscriberId = 'subscriber-1';

    await sendNewsletterCampaignTestEmail({
      campaignId: 'campaign-1',
      email: 'guest@example.com',
      client: makeAdminClient() as never,
    });

    expect(state.createOrRotateUnsubscribeToken).toHaveBeenCalledWith('subscriber-1', expect.any(Object));
    expect(state.sendPlainEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('https://pixiedvc.test/unsubscribe/token-subscriber-1'),
        body: expect.stringContaining('https://pixiedvc.test/unsubscribe/token-subscriber-1'),
      }),
    );
    expect(state.touchedTables).not.toContain('email_campaign_subscribers');
  });

  it('handles a missing campaign safely and does not send', async () => {
    state.campaign = null;

    await expect(
      sendNewsletterCampaignTestEmail({
        campaignId: 'missing-campaign',
        email: 'admin@test.com',
        client: makeAdminClient() as never,
      }),
    ).rejects.toThrow('campaign_not_found');

    expect(state.sendPlainEmail).not.toHaveBeenCalled();
  });
});

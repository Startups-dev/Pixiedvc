import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  sendNewsletterCampaignTestEmail: vi.fn(),
  sendNewsletterCampaignNow: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/admin', () => ({
  requireAdminUser: state.requireAdminUser,
}));

vi.mock('@/lib/newsletter-campaign-test-send', () => ({
  sendNewsletterCampaignTestEmail: state.sendNewsletterCampaignTestEmail,
}));

vi.mock('@/lib/newsletter-campaign-send', () => ({
  sendNewsletterCampaignNow: state.sendNewsletterCampaignNow,
}));

vi.mock('next/navigation', () => ({
  redirect: state.redirect,
  notFound: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { sendCampaignNowAction, sendCampaignTestEmailAction } from '@/app/admin/campaigns/actions';

describe('sendCampaignTestEmailAction', () => {
  beforeEach(() => {
    state.requireAdminUser.mockReset();
    state.sendNewsletterCampaignTestEmail.mockReset();
    state.sendNewsletterCampaignNow.mockReset();
    state.redirect.mockReset();
  });

  it('is blocked by the existing admin guard for non-admin access', async () => {
    state.requireAdminUser.mockRejectedValue(new Error('redirected'));

    const formData = new FormData();
    formData.set('campaignId', 'campaign-1');
    formData.set('testEmail', 'admin@test.com');

    await expect(sendCampaignTestEmailAction(formData)).rejects.toThrow('redirected');
    expect(state.sendNewsletterCampaignTestEmail).not.toHaveBeenCalled();
  });

  it('blocks send-now through the existing admin guard for non-admin access', async () => {
    state.requireAdminUser.mockRejectedValue(new Error('redirected'));

    const formData = new FormData();
    formData.set('campaignId', 'campaign-1');
    formData.set('sendConfirmation', 'SEND');

    await expect(sendCampaignNowAction(formData)).rejects.toThrow('redirected');
    expect(state.sendNewsletterCampaignNow).not.toHaveBeenCalled();
  });
});

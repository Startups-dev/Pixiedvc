import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/email-subscribers', () => ({
  buildUnsubscribeUrl: vi.fn((token: string) => `https://pixiedvc.test/unsubscribe/${token}`),
}));

import {
  buildNewsletterCampaignDraftValuesFromFormData,
  buildNewsletterCampaignActionErrorState,
  buildNewsletterCampaignPersistence,
  getAudienceLabel,
  getNewsletterCampaignEditorValues,
  parseNewsletterCampaignFormData,
} from '@/lib/newsletter-campaigns';

describe('newsletter campaign helpers', () => {
  it('parses valid campaign form data', () => {
    const formData = new FormData();
    formData.set('name', 'July Newsletter');
    formData.set('subject', 'Disney Villa Highlights');
    formData.set('previewText', 'Fresh inventory and resort guides.');
    formData.set('audience', 'newsletter_subscribers');
    formData.set('heroImageUrl', 'https://pixiedvc.test/hero.png');
    formData.set('featuredResort', 'Riviera');
    formData.append('sectionTitle', 'Featured inventory');
    formData.append('sectionContent', 'New availability this week.');
    formData.set('primaryCtaLabel', 'Browse Ready Stays');
    formData.set('primaryCtaUrl', 'https://pixiedvc.test/ready-stays');
    formData.set('secondaryCtaLabel', 'Explore Resorts');
    formData.set('secondaryCtaUrl', 'https://pixiedvc.test/resorts');
    formData.set('footerNote', 'You are receiving this because you opted in.');

    const parsed = parseNewsletterCampaignFormData(formData);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const payload = buildNewsletterCampaignPersistence(parsed.data);
      expect(payload.insertOrUpdate.subject).toBe('Disney Villa Highlights');
      expect(payload.insertOrUpdate.segment_slug).toBe('newsletter_subscribers');
      expect(payload.insertOrUpdate.content_json).toMatchObject({
        hero_image_url: 'https://pixiedvc.test/hero.png',
        featured_resort: 'Riviera',
      });
      expect(payload.insertOrUpdate.body_text).toContain('Browse Ready Stays: https://pixiedvc.test/ready-stays');
      expect(payload.insertOrUpdate.body_html).toContain('Unsubscribe here');
    }
  });

  it('returns validation errors for missing body sections and incomplete ctas', () => {
    const formData = new FormData();
    formData.set('subject', 'Test Campaign');
    formData.set('audience', 'newsletter_subscribers');
    formData.append('sectionTitle', '');
    formData.append('sectionContent', '');
    formData.set('primaryCtaLabel', 'Browse Ready Stays');
    formData.set('primaryCtaUrl', '');

    const parsed = parseNewsletterCampaignFormData(formData);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const values = buildNewsletterCampaignDraftValuesFromFormData(formData);
      const state = buildNewsletterCampaignActionErrorState(parsed.error, values);
      expect(state.fieldErrors?.bodySections).toBe('Add at least one body section.');
      expect(state.fieldErrors?.primaryCta).toBe('Primary CTA label and URL must both be provided.');
      expect(state.values).toMatchObject({
        subject: 'Test Campaign',
        audience: 'newsletter_subscribers',
        primaryCtaLabel: 'Browse Ready Stays',
      });
    }
  });

  it('builds editor values from a saved campaign row', () => {
    const values = getNewsletterCampaignEditorValues({
      id: 'campaign-1',
      name: 'August Newsletter',
      subject: 'August villas',
      preview_text: 'New villas this month.',
      body_text: null,
      body_html: '<html></html>',
      content_json: {
        hero_image_url: 'https://pixiedvc.test/hero.png',
        featured_resort: 'BoardWalk',
        body_sections: [{ title: 'Highlights', content: 'Body copy' }],
        primary_cta_label: 'Browse',
        primary_cta_url: 'https://pixiedvc.test/browse',
        secondary_cta_label: 'Explore',
        secondary_cta_url: 'https://pixiedvc.test/explore',
        footer_note: 'Footer note',
      },
      status: 'draft',
      segment_slug: 'guest_leads',
      created_at: '2026-01-01T00:00:00.000Z',
      scheduled_at: null,
      sent_at: null,
    });

    expect(values).toMatchObject({
      id: 'campaign-1',
      name: 'August Newsletter',
      subject: 'August villas',
      audience: 'guest_leads',
      heroImageUrl: 'https://pixiedvc.test/hero.png',
      featuredResort: 'BoardWalk',
    });
    expect(getAudienceLabel('founding_owners')).toBe('Founding Owners');
  });
});

import { describe, expect, it } from 'vitest';

import {
  normalizeNewsletterCampaignContent,
  renderNewsletterCampaign,
} from '@/lib/newsletter-campaign-renderer';

describe('normalizeNewsletterCampaignContent', () => {
  it('normalizes optional fields and drops invalid sections safely', () => {
    const content = normalizeNewsletterCampaignContent({
      hero_image_url: ' https://pixiedvc.test/hero.png ',
      featured_resort: ' Riviera Resort ',
      body_sections: [
        { title: '  First ', content: ' Body copy ' },
        { title: '  ', content: '  ' },
        null,
      ],
      primary_cta_label: ' Browse ',
      primary_cta_url: ' https://pixiedvc.test/ready-stays ',
      secondary_cta_label: '',
      secondary_cta_url: '',
      footer_note: ' Helpful footer note ',
    });

    expect(content).toEqual({
      hero_image_url: 'https://pixiedvc.test/hero.png',
      featured_resort: 'Riviera Resort',
      body_sections: [{ title: 'First', content: 'Body copy' }],
      primary_cta_label: 'Browse',
      primary_cta_url: 'https://pixiedvc.test/ready-stays',
      secondary_cta_label: null,
      secondary_cta_url: null,
      footer_note: 'Helpful footer note',
    });
  });
});

describe('renderNewsletterCampaign', () => {
  it('renders a campaign with a hero image and unsubscribe footer', () => {
    const rendered = renderNewsletterCampaign({
      subject: 'July Villas Worth Watching',
      unsubscribeUrl: 'https://pixiedvc.test/unsubscribe/token-123',
      contentJson: {
        hero_image_url: 'https://pixiedvc.test/hero.png',
        featured_resort: 'Grand Floridian',
        body_sections: [{ title: 'Featured', content: 'New inventory is live now.' }],
        footer_note: 'You are receiving this because you joined PixieDVC updates.',
      },
    });

    expect(rendered.html).toContain('https://pixiedvc.test/hero.png');
    expect(rendered.html).toContain('Grand Floridian featured travel image');
    expect(rendered.html).toContain('Featured');
    expect(rendered.html).toContain('New inventory is live now.');
    expect(rendered.html).toContain('Unsubscribe here');
    expect(rendered.text).toContain('July Villas Worth Watching');
    expect(rendered.text).toContain('Featured');
    expect(rendered.text).toContain('New inventory is live now.');
    expect(rendered.text).toContain('Unsubscribe: https://pixiedvc.test/unsubscribe/token-123');
  });

  it('omits the hero image when not provided', () => {
    const rendered = renderNewsletterCampaign({
      subject: 'No Hero Needed',
      contentJson: {
        body_sections: [{ title: 'Quick update', content: 'Simple email body.' }],
      },
    });

    expect(rendered.html).not.toContain('<img src=');
  });

  it('renders multiple body sections and both ctas', () => {
    const rendered = renderNewsletterCampaign({
      subject: 'Dual CTA Newsletter',
      contentJson: {
        body_sections: [
          { title: 'Section One', content: 'First body section.' },
          { title: 'Section Two', content: 'Second body section.' },
        ],
        primary_cta_label: 'Browse Ready Stays',
        primary_cta_url: 'https://pixiedvc.test/ready-stays',
        secondary_cta_label: 'Explore Resorts',
        secondary_cta_url: 'https://pixiedvc.test/resorts',
      },
    });

    expect(rendered.html).toContain('Section One');
    expect(rendered.html).toContain('Section Two');
    expect(rendered.html).toContain('Browse Ready Stays');
    expect(rendered.html).toContain('Explore Resorts');
    expect(rendered.text).toContain('Browse Ready Stays: https://pixiedvc.test/ready-stays');
    expect(rendered.text).toContain('Explore Resorts: https://pixiedvc.test/resorts');
  });

  it('omits ctas when label or url is missing', () => {
    const rendered = renderNewsletterCampaign({
      subject: 'Incomplete CTA Campaign',
      contentJson: {
        body_sections: [{ title: 'Update', content: 'Body content.' }],
        primary_cta_label: 'Browse Ready Stays',
        primary_cta_url: '',
        secondary_cta_label: '',
        secondary_cta_url: 'https://pixiedvc.test/resorts',
      },
    });

    expect(rendered.html).not.toContain('Browse Ready Stays');
    expect(rendered.html).not.toContain('https://pixiedvc.test/resorts');
    expect(rendered.text).not.toContain('Browse Ready Stays:');
    expect(rendered.text).not.toContain('https://pixiedvc.test/resorts');
  });

  it('includes plain text body, footer note, and unsubscribe link in the expected order', () => {
    const rendered = renderNewsletterCampaign({
      subject: 'Plain Text Campaign',
      unsubscribeUrl: 'https://pixiedvc.test/unsubscribe/plain',
      contentJson: {
        body_sections: [{ title: 'Spotlight', content: 'Resort spotlight copy.' }],
        footer_note: 'Footer reminder text.',
      },
    });

    expect(rendered.text).toContain('Plain Text Campaign');
    expect(rendered.text).toContain('Spotlight');
    expect(rendered.text).toContain('Resort spotlight copy.');
    expect(rendered.text).toContain('Footer reminder text.');
    expect(rendered.text).toContain('Unsubscribe: https://pixiedvc.test/unsubscribe/plain');
    expect(rendered.html).toContain('Footer reminder text.');
  });
});

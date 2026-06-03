import { describe, expect, it } from 'vitest';

import { buildWelcomeSequenceTemplate } from '@/lib/email/templates/welcome-sequence';

describe('buildWelcomeSequenceTemplate', () => {
  it('renders the final production copy for day 0', () => {
    const template = buildWelcomeSequenceTemplate(0, {
      firstName: 'Cristiano',
      readyStaysUrl: 'https://pixiedvc.test/ready-stays',
      resortsUrl: 'https://pixiedvc.test/resorts',
      unsubscribeUrl: 'https://pixiedvc.test/unsubscribe/token-123',
      welcomeDay0HeroImageUrl: 'https://pixiedvc.test/welcome-hero.png',
      welcomeDay0SecondaryImageUrl: 'https://pixiedvc.test/welcome-secondary.png',
    });

    expect(template.subject).toBe('Welcome to PixieDVC');
    expect(template.previewText).toBe('Your Disney villa insider access starts here.');
    expect(template.text).toContain('Hi Cristiano,');
    expect(template.text).toContain('You’re officially on the PixieDVC Insider list.');
    expect(template.text).toContain('Browse Ready Stays: https://pixiedvc.test/ready-stays');
    expect(template.text).toContain('Explore Disney Resorts: https://pixiedvc.test/resorts');
    expect(template.text).toContain('Unsubscribe: https://pixiedvc.test/unsubscribe/token-123');
    expect(template.html).toContain('Welcome to PixieDVC');
    expect(template.html).toContain('Browse Ready Stays');
    expect(template.html).toContain('Explore Disney Resorts');
    expect(template.html).toContain('Unsubscribe here');
    expect(template.html).toContain('https://pixiedvc.test/welcome-hero.png');
    expect(template.html).toContain('https://pixiedvc.test/welcome-secondary.png');
    expect(template.html).toContain('Elegant Disney villa living room interior');
    expect(template.html).toContain('Family enjoying a relaxed Disney vacation moment together');
  });

  it('omits day 0 images cleanly when image urls are missing', () => {
    const template = buildWelcomeSequenceTemplate(0, {
      readyStaysUrl: 'https://pixiedvc.test/ready-stays',
      resortsUrl: 'https://pixiedvc.test/resorts',
    });

    expect(template.html).not.toContain('<img src=');
  });

  it('renders the updated day 30 subject and CTA copy', () => {
    const template = buildWelcomeSequenceTemplate(30, {
      readyStaysUrl: 'https://pixiedvc.test/ready-stays',
      resortsUrl: 'https://pixiedvc.test/resorts',
    });

    expect(template.subject).toBe('Your PixieDVC Insider Access Continues');
    expect(template.previewText).toBe('What to expect from us going forward.');
    expect(template.text).toContain('You’re Now Part of the PixieDVC Insider List');
    expect(template.text).toContain('Browse Ready Stays: https://pixiedvc.test/ready-stays');
    expect(template.text).toContain('Explore Resort Guides: https://pixiedvc.test/resorts');
  });
});

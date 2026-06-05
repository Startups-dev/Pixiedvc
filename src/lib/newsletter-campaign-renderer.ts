import { renderEmailLayout } from '@/lib/email/templates/layout';

export type NewsletterCampaignSection = {
  title?: string | null;
  content?: string | null;
};

export type NewsletterCampaignContent = {
  hero_image_url?: string | null;
  featured_resort?: string | null;
  body_sections?: NewsletterCampaignSection[] | null;
  primary_cta_label?: string | null;
  primary_cta_url?: string | null;
  secondary_cta_label?: string | null;
  secondary_cta_url?: string | null;
  footer_note?: string | null;
};

export type NewsletterCampaignRecord = {
  subject: string;
  previewText?: string | null;
  contentJson?: NewsletterCampaignContent | Record<string, unknown> | null;
  unsubscribeUrl?: string | null;
};

export type RenderedNewsletterCampaign = {
  html: string;
  text: string;
  content: NewsletterCampaignContent;
};

const DISCLAIMER =
  'PixieDVC is an independent vacation rental platform and is not affiliated with, sponsored by, or endorsed by The Walt Disney Company or Disney Vacation Club.';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeSection(value: unknown): NewsletterCampaignSection | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const title = normalizeString((value as { title?: unknown }).title);
  const content = normalizeString((value as { content?: unknown }).content);
  if (!title && !content) return null;

  return {
    title,
    content,
  };
}

export function normalizeNewsletterCampaignContent(
  input?: NewsletterCampaignContent | Record<string, unknown> | null,
): NewsletterCampaignContent {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      body_sections: [],
    };
  }

  const bodySectionsRaw = Array.isArray((input as { body_sections?: unknown }).body_sections)
    ? ((input as { body_sections?: unknown[] }).body_sections ?? [])
    : [];

  return {
    hero_image_url: normalizeString((input as { hero_image_url?: unknown }).hero_image_url),
    featured_resort: normalizeString((input as { featured_resort?: unknown }).featured_resort),
    body_sections: bodySectionsRaw.map(normalizeSection).filter((value): value is NewsletterCampaignSection => Boolean(value)),
    primary_cta_label: normalizeString((input as { primary_cta_label?: unknown }).primary_cta_label),
    primary_cta_url: normalizeString((input as { primary_cta_url?: unknown }).primary_cta_url),
    secondary_cta_label: normalizeString((input as { secondary_cta_label?: unknown }).secondary_cta_label),
    secondary_cta_url: normalizeString((input as { secondary_cta_url?: unknown }).secondary_cta_url),
    footer_note: normalizeString((input as { footer_note?: unknown }).footer_note),
  };
}

function renderHeroImageHtml(content: NewsletterCampaignContent) {
  if (!content.hero_image_url) return null;

  const alt = content.featured_resort
    ? `${content.featured_resort} featured travel image`
    : 'PixieDVC featured travel image';

  return [
    '<table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border="0" style="border-collapse:collapse;margin:0 0 18px;">',
    '<tr>',
    '<td style="padding:0;">',
    `<img src="${escapeHtml(content.hero_image_url)}" alt="${escapeHtml(
      alt,
    )}" width="584" style="display:block;width:100%;max-width:584px;height:auto;border:0;border-radius:18px;outline:none;text-decoration:none;" />`,
    '</td>',
    '</tr>',
    '</table>',
  ].join('');
}

function buildFooterHtml(footerNote?: string | null, unsubscribeUrl?: string | null) {
  const parts: string[] = [];

  if (footerNote) {
    parts.push(`<p style="margin:0 0 10px;">${escapeHtml(footerNote)}</p>`);
  }

  if (unsubscribeUrl) {
    parts.push(
      `<p style="margin:0 0 10px;">You are receiving this email because you joined the PixieDVC Insider list. <a href="${escapeHtml(
        unsubscribeUrl,
      )}" style="color:#163566;text-decoration:underline;">Unsubscribe here</a>.</p>`,
    );
  }

  parts.push(`<p style="margin:0;">${escapeHtml(DISCLAIMER)}</p>`);

  return parts.join('');
}

export function renderNewsletterCampaign(input: NewsletterCampaignRecord): RenderedNewsletterCampaign {
  const subject = input.subject.trim();
  const content = normalizeNewsletterCampaignContent(input.contentJson);
  const bodySections = content.body_sections ?? [];

  const text = [
    subject,
    '',
    ...bodySections.flatMap((section) => {
      const lines = [section.title ?? null, section.content ?? null].filter((line): line is string => Boolean(line));
      return lines.length ? [...lines, ''] : [];
    }),
    content.primary_cta_label && content.primary_cta_url
      ? `${content.primary_cta_label}: ${content.primary_cta_url}`
      : null,
    content.secondary_cta_label && content.secondary_cta_url
      ? `${content.secondary_cta_label}: ${content.secondary_cta_url}`
      : null,
    content.footer_note ?? null,
    input.unsubscribeUrl ? `Unsubscribe: ${input.unsubscribeUrl}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  const html = renderEmailLayout({
    title: subject,
    topHtml: renderHeroImageHtml(content),
    sections: bodySections.map((section) => ({
      title: section.title ?? null,
      lines: section.content ? [section.content] : [],
    })),
    ctaLabel: content.primary_cta_label ?? null,
    ctaUrl: content.primary_cta_url ?? null,
    secondaryCtaLabel: content.secondary_cta_label ?? null,
    secondaryCtaUrl: content.secondary_cta_url ?? null,
    footerHtml: buildFooterHtml(content.footer_note, input.unsubscribeUrl),
  });

  return {
    html,
    text,
    content,
  };
}

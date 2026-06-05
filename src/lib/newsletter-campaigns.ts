import { z } from 'zod';

import { buildUnsubscribeUrl } from '@/lib/email-subscribers';
import {
  normalizeNewsletterCampaignContent,
  renderNewsletterCampaign,
  type NewsletterCampaignContent,
  type NewsletterCampaignSection,
} from '@/lib/newsletter-campaign-renderer';

export const NEWSLETTER_CAMPAIGN_AUDIENCE_OPTIONS = [
  { slug: 'newsletter_subscribers', label: 'All newsletter subscribers' },
  { slug: 'ready_stay_alerts', label: 'Ready Stay Alerts' },
  { slug: 'guest_leads', label: 'Guest Leads' },
  { slug: 'owner_leads', label: 'Owner Leads' },
  { slug: 'verified_owners', label: 'Verified Owners' },
  { slug: 'founding_owners', label: 'Founding Owners' },
  { slug: 'liquidation_leads', label: 'Liquidation Leads' },
] as const;

export type NewsletterCampaignAudienceSlug = (typeof NEWSLETTER_CAMPAIGN_AUDIENCE_OPTIONS)[number]['slug'];

export type EmailCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'archived';

export type NewsletterCampaignEditorValues = {
  id?: string | null;
  name: string;
  subject: string;
  previewText: string;
  audience: NewsletterCampaignAudienceSlug;
  heroImageUrl: string;
  featuredResort: string;
  bodySections: NewsletterCampaignSection[];
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  footerNote: string;
  status?: EmailCampaignStatus;
  createdAt?: string | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
};

export type NewsletterCampaignListRow = {
  id: string;
  name: string | null;
  subject: string;
  status: EmailCampaignStatus;
  segment_slug: string | null;
  created_at: string;
  scheduled_at: string | null;
  sent_at: string | null;
};

export type NewsletterCampaignEditorRow = {
  id: string;
  name: string | null;
  subject: string;
  preview_text: string | null;
  body_text: string | null;
  body_html: string;
  content_json: NewsletterCampaignContent | null;
  status: EmailCampaignStatus;
  segment_slug: string | null;
  created_at: string;
  scheduled_at: string | null;
  sent_at: string | null;
};

export type NewsletterCampaignEditorState = {
  status: 'idle' | 'error' | 'saved' | 'created';
  message: string | null;
  fieldErrors?: Partial<Record<'name' | 'subject' | 'previewText' | 'audience' | 'heroImageUrl' | 'primaryCta' | 'secondaryCta' | 'bodySections', string>>;
  previewHtml?: string | null;
  previewText?: string | null;
  campaignId?: string | null;
};

const audienceSlugs = NEWSLETTER_CAMPAIGN_AUDIENCE_OPTIONS.map((option) => option.slug);

const sectionSchema = z.object({
  title: z.string().trim().max(120).optional().default(''),
  content: z.string().trim().max(4000).optional().default(''),
});

const baseSchema = z
  .object({
    name: z.string().trim().max(160).optional().default(''),
    subject: z.string().trim().min(1, 'Subject is required.').max(200),
    previewText: z.string().trim().max(280).optional().default(''),
    audience: z.enum(audienceSlugs as unknown as [NewsletterCampaignAudienceSlug, ...NewsletterCampaignAudienceSlug[]], {
      errorMap: () => ({ message: 'Select an audience.' }),
    }),
    heroImageUrl: z.union([z.string().trim().url('Enter a valid hero image URL.'), z.literal('')]).default(''),
    featuredResort: z.string().trim().max(160).optional().default(''),
    bodySections: z.array(sectionSchema),
    primaryCtaLabel: z.string().trim().max(80).optional().default(''),
    primaryCtaUrl: z.union([z.string().trim().url('Enter a valid primary CTA URL.'), z.literal('')]).default(''),
    secondaryCtaLabel: z.string().trim().max(80).optional().default(''),
    secondaryCtaUrl: z.union([z.string().trim().url('Enter a valid secondary CTA URL.'), z.literal('')]).default(''),
    footerNote: z.string().trim().max(500).optional().default(''),
  })
  .superRefine((value, ctx) => {
    const hasBodySection = value.bodySections.some((section) => section.title || section.content);
    if (!hasBodySection) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Add at least one body section.',
        path: ['bodySections'],
      });
    }

    const hasPrimaryLabel = value.primaryCtaLabel.length > 0;
    const hasPrimaryUrl = value.primaryCtaUrl.length > 0;
    if (hasPrimaryLabel !== hasPrimaryUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Primary CTA label and URL must both be provided.',
        path: ['primaryCta'],
      });
    }

    const hasSecondaryLabel = value.secondaryCtaLabel.length > 0;
    const hasSecondaryUrl = value.secondaryCtaUrl.length > 0;
    if (hasSecondaryLabel !== hasSecondaryUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Secondary CTA label and URL must both be provided.',
        path: ['secondaryCta'],
      });
    }
  });

export const INITIAL_NEWSLETTER_CAMPAIGN_EDITOR_STATE: NewsletterCampaignEditorState = {
  status: 'idle',
  message: null,
};

export function getAudienceLabel(slug?: string | null) {
  return NEWSLETTER_CAMPAIGN_AUDIENCE_OPTIONS.find((option) => option.slug === slug)?.label ?? slug ?? '—';
}

export function buildNewsletterCampaignPreview(content: NewsletterCampaignEditorValues, unsubscribeUrl?: string | null) {
  return renderNewsletterCampaign({
    subject: content.subject,
    previewText: content.previewText,
    unsubscribeUrl,
    contentJson: buildNewsletterCampaignContentJson(content),
  });
}

export function buildNewsletterCampaignContentJson(values: NewsletterCampaignEditorValues): NewsletterCampaignContent {
  return normalizeNewsletterCampaignContent({
    hero_image_url: values.heroImageUrl,
    featured_resort: values.featuredResort,
    body_sections: values.bodySections,
    primary_cta_label: values.primaryCtaLabel,
    primary_cta_url: values.primaryCtaUrl,
    secondary_cta_label: values.secondaryCtaLabel,
    secondary_cta_url: values.secondaryCtaUrl,
    footer_note: values.footerNote,
  });
}

export function getNewsletterCampaignEditorValues(row?: NewsletterCampaignEditorRow | null): NewsletterCampaignEditorValues {
  const content = normalizeNewsletterCampaignContent(row?.content_json ?? null);
  const normalizedSections = content.body_sections?.length ? content.body_sections : [{ title: '', content: '' }];

  return {
    id: row?.id ?? null,
    name: row?.name ?? '',
    subject: row?.subject ?? '',
    previewText: row?.preview_text ?? '',
    audience: (row?.segment_slug as NewsletterCampaignAudienceSlug | null) ?? 'newsletter_subscribers',
    heroImageUrl: content.hero_image_url ?? '',
    featuredResort: content.featured_resort ?? '',
    bodySections: normalizedSections,
    primaryCtaLabel: content.primary_cta_label ?? '',
    primaryCtaUrl: content.primary_cta_url ?? '',
    secondaryCtaLabel: content.secondary_cta_label ?? '',
    secondaryCtaUrl: content.secondary_cta_url ?? '',
    footerNote: content.footer_note ?? '',
    status: row?.status ?? 'draft',
    createdAt: row?.created_at ?? null,
    scheduledAt: row?.scheduled_at ?? null,
    sentAt: row?.sent_at ?? null,
  };
}

export function parseNewsletterCampaignFormData(formData: FormData) {
  const bodySections = formData
    .getAll('sectionTitle')
    .map((title, index) => ({
      title: String(title ?? ''),
      content: String(formData.getAll('sectionContent')[index] ?? ''),
    }));

  return baseSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    subject: String(formData.get('subject') ?? ''),
    previewText: String(formData.get('previewText') ?? ''),
    audience: String(formData.get('audience') ?? ''),
    heroImageUrl: String(formData.get('heroImageUrl') ?? ''),
    featuredResort: String(formData.get('featuredResort') ?? ''),
    bodySections,
    primaryCtaLabel: String(formData.get('primaryCtaLabel') ?? ''),
    primaryCtaUrl: String(formData.get('primaryCtaUrl') ?? ''),
    secondaryCtaLabel: String(formData.get('secondaryCtaLabel') ?? ''),
    secondaryCtaUrl: String(formData.get('secondaryCtaUrl') ?? ''),
    footerNote: String(formData.get('footerNote') ?? ''),
  });
}

export function buildNewsletterCampaignActionErrorState(error: z.ZodError): NewsletterCampaignEditorState {
  const fieldErrors: NewsletterCampaignEditorState['fieldErrors'] = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key === 'name' || key === 'subject' || key === 'previewText' || key === 'audience' || key === 'heroImageUrl') {
      fieldErrors[key] ??= issue.message;
    }
    if (key === 'primaryCta') {
      fieldErrors.primaryCta ??= issue.message;
    }
    if (key === 'secondaryCta') {
      fieldErrors.secondaryCta ??= issue.message;
    }
    if (key === 'bodySections') {
      fieldErrors.bodySections ??= issue.message;
    }
  }

  return {
    status: 'error',
    message: 'Fix the highlighted fields and save again.',
    fieldErrors,
  };
}

export function buildNewsletterCampaignPersistence(parsed: z.infer<typeof baseSchema>) {
  const values: NewsletterCampaignEditorValues = {
    name: parsed.name,
    subject: parsed.subject,
    previewText: parsed.previewText,
    audience: parsed.audience,
    heroImageUrl: parsed.heroImageUrl,
    featuredResort: parsed.featuredResort,
    bodySections: parsed.bodySections.filter((section) => section.title || section.content),
    primaryCtaLabel: parsed.primaryCtaLabel,
    primaryCtaUrl: parsed.primaryCtaUrl,
    secondaryCtaLabel: parsed.secondaryCtaLabel,
    secondaryCtaUrl: parsed.secondaryCtaUrl,
    footerNote: parsed.footerNote,
  };

  const rendered = buildNewsletterCampaignPreview(values, buildUnsubscribeUrl('preview-token'));

  return {
    values,
    rendered,
    insertOrUpdate: {
      name: values.name || null,
      subject: values.subject,
      preview_text: values.previewText || null,
      body_text: rendered.text,
      body_html: rendered.html,
      content_json: buildNewsletterCampaignContentJson(values),
      segment_slug: values.audience,
    },
  };
}

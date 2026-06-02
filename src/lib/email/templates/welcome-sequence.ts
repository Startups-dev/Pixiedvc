import { renderEmailLayout } from '@/lib/email/templates/layout';

export type WelcomeSequenceStep = 0 | 3 | 7 | 14 | 21 | 30;

type WelcomeSequenceTemplateInput = {
  firstName?: string | null;
  browseUrl?: string | null;
  readyStaysUrl?: string | null;
  resortsUrl?: string | null;
  requestStayUrl?: string | null;
  lastMinuteUrl?: string | null;
  howItWorksUrl?: string | null;
  unsubscribeUrl?: string | null;
};

type WelcomeSequenceTemplate = {
  subject: string;
  previewText: string;
  text: string;
  html: string;
};

type WelcomeEmailContent = {
  subject: string;
  previewText: string;
  title: string;
  intro: string;
  body: Array<
    | { kind: 'paragraph'; text: string }
    | { kind: 'list'; items: string[] }
  >;
  primaryCtaLabel: string;
  primaryCtaUrl: string | null;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string | null;
  signoff?: string[];
};

function introName(firstName?: string | null) {
  const name = firstName?.trim();
  return name ? `Hi ${name},` : 'Hi there,';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderListHtml(items: string[]) {
  return [
    '<ul style="margin:0 0 8px 20px;padding:0;color:#31445b;">',
    ...items.map(
      (item) =>
        `<li style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#31445b;">${escapeHtml(item)}</li>`,
    ),
    '</ul>',
  ].join('');
}

function renderFooterHtml(unsubscribeUrl?: string | null) {
  const disclaimer =
    'PixieDVC is an independent vacation rental platform and is not affiliated with, sponsored by, or endorsed by The Walt Disney Company or Disney Vacation Club.';

  if (!unsubscribeUrl) {
    return `<p style="margin:0 0 10px;">${escapeHtml(disclaimer)}</p>`;
  }

  return [
    `<p style="margin:0 0 10px;">You are receiving this email because you joined the PixieDVC Insider list. <a href="${escapeHtml(
      unsubscribeUrl,
    )}" style="color:#163566;text-decoration:underline;">Unsubscribe here</a>.</p>`,
    `<p style="margin:0;">${escapeHtml(disclaimer)}</p>`,
  ].join('');
}

function buildTemplate(content: WelcomeEmailContent, unsubscribeUrl?: string | null): WelcomeSequenceTemplate {
  const text = [
    content.title,
    '',
    content.intro,
    '',
    ...content.body.flatMap((section) =>
      section.kind === 'paragraph'
        ? [section.text, '']
        : [...section.items.map((item) => `- ${item}`), ''],
    ),
    ...(content.signoff ? [...content.signoff, ''] : []),
    `${content.primaryCtaLabel}: ${content.primaryCtaUrl ?? ''}`.trim(),
    `${content.secondaryCtaLabel}: ${content.secondaryCtaUrl ?? ''}`.trim(),
    unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : null,
  ]
    .filter((line): line is string => line !== null && line.length > 0)
    .join('\n');

  const htmlSections = content.body.map((section) =>
    section.kind === 'paragraph'
      ? { lines: [section.text] }
      : { html: renderListHtml(section.items) },
  );

  if (content.signoff?.length) {
    htmlSections.push({ lines: content.signoff });
  }

  const html = renderEmailLayout({
    title: content.title,
    intro: content.intro,
    sections: htmlSections,
    ctaLabel: content.primaryCtaLabel,
    ctaUrl: content.primaryCtaUrl,
    secondaryCtaLabel: content.secondaryCtaLabel,
    secondaryCtaUrl: content.secondaryCtaUrl,
    footerHtml: renderFooterHtml(unsubscribeUrl),
  });

  return {
    subject: content.subject,
    previewText: content.previewText,
    text,
    html,
  };
}

export function buildWelcomeSequenceTemplate(
  step: WelcomeSequenceStep,
  input: WelcomeSequenceTemplateInput = {},
): WelcomeSequenceTemplate {
  const intro = introName(input.firstName);

  if (step === 0) {
    return buildTemplate(
      {
        subject: 'Welcome to PixieDVC',
        previewText: 'Your Disney villa insider access starts here.',
        title: 'Welcome to PixieDVC',
        intro,
        body: [
          { kind: 'paragraph', text: 'You’re officially on the PixieDVC Insider list.' },
          {
            kind: 'paragraph',
            text: 'PixieDVC helps Disney travelers discover villa stays through verified Disney Vacation Club owners — including Ready Stays, last-minute opportunities, and custom booking matches.',
          },
          { kind: 'paragraph', text: 'Here’s what we’ll send you:' },
          {
            kind: 'list',
            items: [
              'New Ready Stay opportunities',
              'Disney villa deals',
              'Resort guides and booking tips',
              'Last-minute availability alerts',
              'Special PixieDVC promotions',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Whether you’re planning months ahead or hoping to find a great stay sooner, we’ll help you understand your options.',
          },
        ],
        signoff: ['See you real soon,', 'The PixieDVC Team'],
        primaryCtaLabel: 'Browse Ready Stays',
        primaryCtaUrl: input.readyStaysUrl ?? input.browseUrl ?? null,
        secondaryCtaLabel: 'Explore Disney Resorts',
        secondaryCtaUrl: input.resortsUrl ?? null,
      },
      input.unsubscribeUrl,
    );
  }

  if (step === 3) {
    return buildTemplate(
      {
        subject: 'Ready Stay or Custom Search? Here’s the Difference',
        previewText: 'Two ways to find your Disney villa stay.',
        title: 'Two Ways to Book a Disney Villa Stay',
        intro,
        body: [
          { kind: 'paragraph', text: 'With PixieDVC, there are two main ways to plan your stay.' },
          {
            kind: 'paragraph',
            text: 'Ready Stays: These are Disney villa reservations already secured by verified DVC owners. The dates, resort, and room type are already set. They’re great when you want a faster path to booking.',
          },
          {
            kind: 'paragraph',
            text: 'Custom Search: Tell us where and when you want to travel, and we help match you with available DVC points from verified owners.',
          },
          { kind: 'paragraph', text: 'A simple rule:' },
          {
            kind: 'paragraph',
            text: 'If your dates are flexible, Ready Stays can be a great opportunity.',
          },
          {
            kind: 'paragraph',
            text: 'If your trip needs specific dates, a Custom Search is usually the better fit.',
          },
        ],
        primaryCtaLabel: 'Browse Ready Stays',
        primaryCtaUrl: input.readyStaysUrl ?? input.browseUrl ?? null,
        secondaryCtaLabel: 'Start a Custom Search',
        secondaryCtaUrl: input.requestStayUrl ?? null,
      },
      input.unsubscribeUrl,
    );
  }

  if (step === 7) {
    return buildTemplate(
      {
        subject: 'Why Verified Owners Matter',
        previewText: 'Trust is everything when booking a Disney villa.',
        title: 'Safer Disney Villa Booking Starts With Verified Owners',
        intro,
        body: [
          {
            kind: 'paragraph',
            text: 'Booking through a DVC owner can be a great way to access deluxe Disney villas, but trust matters.',
          },
          {
            kind: 'paragraph',
            text: 'That’s why PixieDVC is built around verified owner participation.',
          },
          {
            kind: 'paragraph',
            text: 'Our goal is to make the process feel clearer, safer, and more organized for both guests and owners.',
          },
          { kind: 'paragraph', text: 'PixieDVC helps by focusing on:' },
          {
            kind: 'list',
            items: [
              'Verified owner profiles',
              'Clear booking steps',
              'Better communication',
              'Organized reservation details',
              'Support throughout the process',
            ],
          },
          {
            kind: 'paragraph',
            text: 'You should not have to feel like you’re figuring everything out alone.',
          },
        ],
        primaryCtaLabel: 'Learn How It Works',
        primaryCtaUrl: input.howItWorksUrl ?? input.browseUrl ?? null,
        secondaryCtaLabel: 'Browse Resorts',
        secondaryCtaUrl: input.resortsUrl ?? null,
      },
      input.unsubscribeUrl,
    );
  }

  if (step === 14) {
    return buildTemplate(
      {
        subject: 'Which Disney Villa Resort Is Right For You?',
        previewText: 'Magic Kingdom, EPCOT, animals, pools, or luxury?',
        title: 'Find the Disney Villa That Fits Your Trip',
        intro,
        body: [
          { kind: 'paragraph', text: 'Every Disney villa resort has a different personality.' },
          { kind: 'paragraph', text: 'Here’s a quick guide:' },
          {
            kind: 'list',
            items: [
              'Love Magic Kingdom? Look at Grand Floridian, Polynesian, Bay Lake Tower, or Wilderness Lodge.',
              'Love EPCOT and Hollywood Studios? Beach Club, BoardWalk, and Riviera are strong options.',
              'Traveling with kids who love animals? Animal Kingdom Villas can be unforgettable.',
              'Want luxury and convenience? Grand Floridian and Riviera are usually top choices.',
              'Want a relaxed resort feel? Old Key West and Saratoga Springs can be great value.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'The best resort depends on your travel style, dates, budget, and priorities.',
          },
        ],
        primaryCtaLabel: 'Explore Resort Guides',
        primaryCtaUrl: input.resortsUrl ?? null,
        secondaryCtaLabel: 'Start Planning Your Stay',
        secondaryCtaUrl: input.requestStayUrl ?? null,
      },
      input.unsubscribeUrl,
    );
  }

  if (step === 21) {
    return buildTemplate(
      {
        subject: 'Last-Minute Disney Villa Deals Can Move Fast',
        previewText: 'Here’s why some opportunities disappear quickly.',
        title: 'Why Last-Minute Villa Opportunities Move Quickly',
        intro,
        body: [
          {
            kind: 'paragraph',
            text: 'Sometimes DVC owners have points or reservations they need to use before they expire.',
          },
          {
            kind: 'paragraph',
            text: 'That can create strong opportunities for guests — especially if your travel dates are flexible.',
          },
          { kind: 'paragraph', text: 'These opportunities may include:' },
          {
            kind: 'list',
            items: [
              'Already-booked Ready Stays',
              'Last-minute villa availability',
              'Owner liquidation opportunities',
              'Fixed-date reservations at popular resorts',
            ],
          },
          { kind: 'paragraph', text: 'The catch?' },
          { kind: 'paragraph', text: 'Good opportunities often don’t last long.' },
          {
            kind: 'paragraph',
            text: 'If you see a stay that fits your dates, resort preference, and budget, it’s usually worth acting quickly.',
          },
        ],
        primaryCtaLabel: 'View Current Opportunities',
        primaryCtaUrl: input.lastMinuteUrl ?? input.readyStaysUrl ?? input.browseUrl ?? null,
        secondaryCtaLabel: 'Join Ready Stay Alerts',
        secondaryCtaUrl: input.readyStaysUrl ?? input.browseUrl ?? null,
      },
      input.unsubscribeUrl,
    );
  }

  return buildTemplate(
    {
      subject: 'Your PixieDVC Insider Access Continues',
      previewText: 'What to expect from us going forward.',
      title: 'You’re Now Part of the PixieDVC Insider List',
      intro,
      body: [
        {
          kind: 'paragraph',
          text: 'Over the past month, we’ve introduced you to how PixieDVC works, what Ready Stays are, why verified owners matter, and how Disney villa opportunities appear.',
        },
        { kind: 'paragraph', text: 'From here, we’ll keep things simple.' },
        { kind: 'paragraph', text: 'You’ll receive occasional emails with:' },
        {
          kind: 'list',
          items: [
            'New Ready Stays',
            'Featured Disney villa opportunities',
            'Resort spotlights',
            'Booking tips',
            'Special promotions',
          ],
        },
        {
          kind: 'paragraph',
          text: 'We’ll avoid clutter and focus on useful Disney villa updates.',
        },
        {
          kind: 'paragraph',
          text: 'When the right stay appears, you’ll be ready.',
        },
      ],
      signoff: ['Thanks for being part of PixieDVC,', 'The PixieDVC Team'],
      primaryCtaLabel: 'Browse Ready Stays',
      primaryCtaUrl: input.readyStaysUrl ?? input.browseUrl ?? null,
      secondaryCtaLabel: 'Explore Resort Guides',
      secondaryCtaUrl: input.resortsUrl ?? null,
    },
    input.unsubscribeUrl,
  );
}

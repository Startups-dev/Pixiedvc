import { renderEmailLayout, textLine } from '@/lib/email/templates/layout';

type ReadyStayLinkReadyTemplateInput = {
  guestName?: string | null;
  confirmationNumber?: string | null;
  tripUrl?: string | null;
};

export function buildReadyStayLinkReadyTemplate({
  guestName,
  confirmationNumber,
  tripUrl,
}: ReadyStayLinkReadyTemplateInput) {
  const subject = 'Your Disney reservation is ready to link';
  const name = guestName?.trim() || 'there';
  const ctaUrl = tripUrl?.trim() || null;

  const text = [
    `Hi ${name},`,
    '',
    'Your reservation is ready to link in My Disney Experience.',
    '',
    textLine('Confirmation number', confirmationNumber),
    '',
    'To link it:',
    '1. Open My Disney Experience',
    '2. Go to My Plans and choose Link a Reservation',
    '3. Enter your confirmation number',
    ctaUrl ? `Open your trip: ${ctaUrl}` : null,
    '',
    'PixieDVC Concierge',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const html = renderEmailLayout({
    title: 'Your reservation is ready to link',
    intro: `Hi ${name}, your confirmation number is now available in your trip details.`,
    sections: [
      {
        title: 'Access details',
        lines: [textLine('Confirmation number', confirmationNumber)],
      },
      {
        lines: [
          'Open My Disney Experience, choose My Plans, then use Link a Reservation to add this stay.',
        ],
      },
    ],
    ctaLabel: ctaUrl ? 'Open Trip' : null,
    ctaUrl,
  });

  return { subject, text, html };
}

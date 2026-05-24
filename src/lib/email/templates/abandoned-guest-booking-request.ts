import { renderEmailLayout, textLine } from '@/lib/email/templates/layout';

type AbandonedGuestBookingRequestTemplateInput = {
  guestName?: string | null;
  resortName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  resumeUrl?: string | null;
};

export function buildAbandonedGuestBookingRequestTemplate({
  guestName,
  resortName,
  checkIn,
  checkOut,
  resumeUrl,
}: AbandonedGuestBookingRequestTemplateInput) {
  const subject = 'Still planning your Disney villa stay?';
  const name = guestName?.trim() || 'there';
  const dates = checkIn && checkOut ? `${checkIn} to ${checkOut}` : checkIn || checkOut || null;
  const ctaUrl = resumeUrl?.trim() || null;

  const text = [
    `Hi ${name},`,
    '',
    'We saved your trip details and can help you continue your request whenever you are ready.',
    resortName?.trim() ? textLine('Resort', resortName) : null,
    dates ? textLine('Dates', dates) : null,
    '',
    'No payment is required to submit a request.',
    ctaUrl ? `Continue your request: ${ctaUrl}` : null,
    '',
    'PixieDVC Concierge',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const html = renderEmailLayout({
    title: 'Your request is waiting when you are ready',
    intro: `Hi ${name}, we saved your trip details and can help you continue your request whenever you are ready.`,
    sections: [
      {
        title: 'Saved trip details',
        lines: [resortName?.trim() ? textLine('Resort', resortName) : null, dates ? textLine('Dates', dates) : null],
      },
      {
        lines: ['No payment is required to submit a request.'],
      },
    ],
    ctaLabel: ctaUrl ? 'Continue Your Request' : null,
    ctaUrl,
  });

  return { subject, text, html };
}

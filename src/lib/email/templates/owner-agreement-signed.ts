import { renderEmailLayout, textLine } from '@/lib/email/templates/layout';

type OwnerAgreementSignedTemplateInput = {
  ownerName?: string | null;
  guestName?: string | null;
  resortName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  rentalUrl?: string | null;
};

export function buildOwnerAgreementSignedTemplate({
  ownerName,
  guestName,
  resortName,
  checkIn,
  checkOut,
  rentalUrl,
}: OwnerAgreementSignedTemplateInput) {
  const subject = 'PixieDVC - Guest agreement completed';
  const name = ownerName?.trim() || 'PixieDVC owner';
  const guest = guestName?.trim() || 'the guest';
  const dates = checkIn && checkOut ? `${checkIn} to ${checkOut}` : checkIn || checkOut || 'the travel dates';
  const ctaUrl = rentalUrl?.trim() || null;

  const text = [
    `Hi ${name},`,
    '',
    `${guest} has completed the rental agreement for the stay below.`,
    '',
    textLine('Resort', resortName),
    textLine('Dates', dates),
    '',
    'No additional signature is required from you right now. We will continue guiding the next operational steps.',
    ctaUrl ? `View reservation details: ${ctaUrl}` : null,
    '',
    'PixieDVC Concierge',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const html = renderEmailLayout({
    title: 'Guest agreement completed',
    intro: `Hi ${name}, ${guest} has completed the rental agreement.`,
    sections: [
      {
        title: 'Stay details',
        lines: [textLine('Resort', resortName), textLine('Dates', dates)],
      },
      {
        lines: ['No additional signature is required from you right now. We will continue guiding the next operational steps.'],
      },
    ],
    ctaLabel: ctaUrl ? 'View Reservation' : null,
    ctaUrl,
  });

  return { subject, text, html };
}

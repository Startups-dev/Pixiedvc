import { renderEmailLayout, textLine } from '@/lib/email/templates/layout';

type GuestAgreementSignedTemplateInput = {
  guestName?: string | null;
  resortName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  agreementUrl?: string | null;
};

export function buildGuestAgreementSignedTemplate({
  guestName,
  resortName,
  checkIn,
  checkOut,
  agreementUrl,
}: GuestAgreementSignedTemplateInput) {
  const subject = 'HannaDVC - Your agreement is complete';
  const name = guestName?.trim() || 'there';
  const dates = checkIn && checkOut ? `${checkIn} to ${checkOut}` : checkIn || checkOut || 'your travel dates';
  const ctaUrl = agreementUrl?.trim() || null;

  const text = [
    `Hi ${name},`,
    '',
    'Your rental agreement has been completed successfully.',
    '',
    textLine('Resort', resortName),
    textLine('Dates', dates),
    '',
    'Our concierge team will follow up with any next steps for your stay.',
    ctaUrl ? `View your agreement: ${ctaUrl}` : null,
    '',
    'HannaDVC Team',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const html = renderEmailLayout({
    title: 'Agreement completed',
    intro: `Hi ${name}, your rental agreement has been completed successfully.`,
    sections: [
      {
        title: 'Stay details',
        lines: [textLine('Resort', resortName), textLine('Dates', dates)],
      },
      {
        lines: ['Our concierge team will follow up with any next steps for your stay.'],
      },
    ],
    ctaLabel: ctaUrl ? 'View Agreement' : null,
    ctaUrl,
  });

  return { subject, text, html };
}

import { renderEmailLayout, textLine } from '@/lib/email/templates/layout';

type ContractGuestAgreementReminderTemplateInput = {
  guestName?: string | null;
  resortName?: string | null;
  roomType?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  points?: number | null;
  totalUsd?: string | null;
  paidNowUsd?: string | null;
  agreementUrl?: string | null;
};

export function buildContractGuestAgreementReminderTemplate({
  guestName,
  resortName,
  roomType,
  checkIn,
  checkOut,
  points,
  totalUsd,
  paidNowUsd,
  agreementUrl,
}: ContractGuestAgreementReminderTemplateInput) {
  const subject = 'Reminder: your PixieDVC rental agreement is ready';
  const name = guestName?.trim() || 'PixieDVC guest';
  const dates = checkIn && checkOut ? `${checkIn} to ${checkOut}` : checkIn || checkOut || 'your travel dates';
  const pointsLabel = typeof points === 'number' && Number.isFinite(points) ? `${points.toLocaleString()}` : null;
  const ctaUrl = agreementUrl?.trim() || null;

  const text = [
    `Hi ${name},`,
    '',
    'Just a quick reminder that your rental agreement is still ready for review and signature.',
    '',
    textLine('Resort', resortName),
    textLine('Room', roomType),
    textLine('Dates', dates),
    textLine('Points', pointsLabel),
    textLine('Total', totalUsd),
    textLine('Due now', paidNowUsd),
    '',
    'Completing the agreement helps keep your reservation moving forward.',
    ctaUrl
      ? `Review and sign: ${ctaUrl}`
      : 'Please contact hello@pixiedvc.com to review and sign the agreement.',
    '',
    'PixieDVC Concierge',
  ].join('\n');

  const html = renderEmailLayout({
    title: 'Agreement reminder',
    intro: `Hi ${name}, your rental agreement is still ready for review.`,
    sections: [
      {
        title: 'Stay summary',
        lines: [
          textLine('Resort', resortName),
          textLine('Room', roomType),
          textLine('Dates', dates),
          textLine('Points', pointsLabel),
          textLine('Total', totalUsd),
          textLine('Due now', paidNowUsd),
        ],
      },
      {
        lines: ['Completing the agreement helps keep your reservation moving forward.'],
      },
    ],
    ctaLabel: ctaUrl ? 'Review & Sign' : null,
    ctaUrl,
  });

  return { subject, text, html };
}

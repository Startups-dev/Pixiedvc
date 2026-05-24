import { renderEmailLayout, textLine } from '@/lib/email/templates/layout';

type ContractOwnerAgreementReminderTemplateInput = {
  ownerName?: string | null;
  guestName?: string | null;
  resortName?: string | null;
  roomType?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  points?: number | null;
  totalUsd?: string | null;
  agreementUrl?: string | null;
};

export function buildContractOwnerAgreementReminderTemplate({
  ownerName,
  guestName,
  resortName,
  roomType,
  checkIn,
  checkOut,
  points,
  totalUsd,
  agreementUrl,
}: ContractOwnerAgreementReminderTemplateInput) {
  const subject = 'Reminder: your PixieDVC owner agreement is ready';
  const name = ownerName?.trim() || 'PixieDVC owner';
  const dates = checkIn && checkOut ? `${checkIn} to ${checkOut}` : checkIn || checkOut || 'the requested dates';
  const pointsLabel = typeof points === 'number' && Number.isFinite(points) ? `${points.toLocaleString()}` : null;
  const ctaUrl = agreementUrl?.trim() || null;

  const text = [
    `Hi ${name},`,
    '',
    'Just a quick reminder that your owner agreement is still ready for review and signature.',
    '',
    textLine('Guest', guestName),
    textLine('Resort', resortName),
    textLine('Room', roomType),
    textLine('Dates', dates),
    textLine('Points', pointsLabel),
    textLine('Total', totalUsd),
    '',
    'Completing the agreement helps keep the reservation moving smoothly.',
    ctaUrl
      ? `Review and sign: ${ctaUrl}`
      : 'Please contact hello@pixiedvc.com to review and sign the agreement.',
    '',
    'PixieDVC Concierge',
  ].join('\n');

  const html = renderEmailLayout({
    title: 'Owner agreement reminder',
    intro: `Hi ${name}, your owner agreement is still ready for review and signature.`,
    sections: [
      {
        title: 'Stay summary',
        lines: [
          textLine('Guest', guestName),
          textLine('Resort', resortName),
          textLine('Room', roomType),
          textLine('Dates', dates),
          textLine('Points', pointsLabel),
          textLine('Total', totalUsd),
        ],
      },
      {
        lines: ['Completing the agreement helps keep the reservation moving smoothly.'],
      },
    ],
    ctaLabel: ctaUrl ? 'Review & Sign' : null,
    ctaUrl,
  });

  return { subject, text, html };
}

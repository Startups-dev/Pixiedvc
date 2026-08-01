import { renderEmailLayout, textLine } from '@/lib/email/templates/layout';

type ContractGuestAgreementTemplateInput = {
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

export function buildContractGuestAgreementTemplate({
  guestName,
  resortName,
  roomType,
  checkIn,
  checkOut,
  points,
  totalUsd,
  paidNowUsd,
  agreementUrl,
}: ContractGuestAgreementTemplateInput) {
  const subject = 'HannaDVC - Your rental agreement is ready';
  const name = guestName?.trim() || 'HannaDVC guest';
  const dates = checkIn && checkOut ? `${checkIn} to ${checkOut}` : checkIn || checkOut || 'your travel dates';
  const pointsLabel = typeof points === 'number' && Number.isFinite(points) ? `${points.toLocaleString()}` : null;
  const ctaUrl = agreementUrl?.trim() || null;

  const text = [
    `Hi ${name},`,
    '',
    'Your rental agreement is ready to review.',
    '',
    textLine('Resort', resortName),
    textLine('Room', roomType),
    textLine('Dates', dates),
    textLine('Points', pointsLabel),
    textLine('Total', totalUsd),
    textLine('Due now', paidNowUsd),
    '',
    'Next step: review the agreement and sign to keep your stay moving forward.',
    ctaUrl
      ? `Review and sign: ${ctaUrl}`
      : 'Please contact hello@hannadvc.com to review and sign the agreement.',
    '',
    'HannaDVC Team',
  ].join('\n');

  const html = renderEmailLayout({
    title: 'Your agreement is ready',
    intro: `Hi ${name}, your stay summary is confirmed and your agreement is ready for review.`,
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
        lines: ['Next step: review the agreement and sign to keep your stay moving forward.'],
      },
    ],
    ctaLabel: ctaUrl ? 'Review & Sign' : null,
    ctaUrl,
  });

  return { subject, text, html };
}

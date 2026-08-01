import { renderEmailLayout, textLine } from '@/lib/email/templates/layout';

type ContractOwnerAgreementTemplateInput = {
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

export function buildContractOwnerAgreementTemplate({
  ownerName,
  guestName,
  resortName,
  roomType,
  checkIn,
  checkOut,
  points,
  totalUsd,
  agreementUrl,
}: ContractOwnerAgreementTemplateInput) {
  const subject = 'HannaDVC - Owner agreement ready for review';
  const name = ownerName?.trim() || 'HannaDVC owner';
  const dates = checkIn && checkOut ? `${checkIn} to ${checkOut}` : checkIn || checkOut || 'the requested dates';
  const pointsLabel = typeof points === 'number' && Number.isFinite(points) ? `${points.toLocaleString()}` : null;
  const ctaUrl = agreementUrl?.trim() || null;

  const text = [
    `Hi ${name},`,
    '',
    'Your owner agreement is ready for review and signature.',
    '',
    textLine('Guest', guestName),
    textLine('Resort', resortName),
    textLine('Room', roomType),
    textLine('Dates', dates),
    textLine('Points', pointsLabel),
    textLine('Total', totalUsd),
    '',
    ctaUrl
      ? `Review and sign: ${ctaUrl}`
      : 'Please contact hello@hannadvc.com to review and sign the agreement.',
    '',
    'HannaDVC Team',
  ].join('\n');

  const html = renderEmailLayout({
    title: 'Owner agreement ready',
    intro: `Hi ${name}, your agreement is ready for review and signature.`,
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
    ],
    ctaLabel: ctaUrl ? 'Review & Sign' : null,
    ctaUrl,
  });

  return { subject, text, html };
}

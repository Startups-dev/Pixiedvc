import { renderEmailLayout, textLine } from '@/lib/email/templates/layout';

type ReadyStayRejectedTemplateInput = {
  ownerName?: string | null;
  resortName?: string | null;
  roomType?: string | null;
  dates?: string | null;
  reason?: string | null;
};

export function buildReadyStayRejectedTemplate({
  ownerName,
  resortName,
  roomType,
  dates,
  reason,
}: ReadyStayRejectedTemplateInput) {
  const subject = 'PixieDVC - More information needed for your Ready Stay';
  const name = ownerName?.trim() || 'PixieDVC owner';
  const cleanReason = reason?.trim() || null;

  const text = [
    `Hi ${name},`,
    '',
    `We need a little more information before your Ready Stay at ${resortName?.trim() || 'your Ready Stay'} can appear to guests.`,
    roomType?.trim() ? textLine('Room type', roomType) : null,
    textLine('Dates', dates),
    cleanReason ? '' : null,
    cleanReason ? `Reason: ${cleanReason}` : null,
    '',
    'You can update the listing and resubmit when ready. If you need help, reply to this email and our team will assist.',
    '',
    'PixieDVC Concierge',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const html = renderEmailLayout({
    title: 'More information needed',
    intro: `Hi ${name}, we need a little more information before this Ready Stay can appear to guests.`,
    sections: [
      {
        title: 'Listing details',
        lines: [roomType?.trim() ? textLine('Room type', roomType) : null, textLine('Dates', dates)],
      },
      cleanReason
        ? {
            title: 'Reason',
            lines: [cleanReason],
          }
        : {
            lines: [],
          },
      {
        lines: ['You can update the listing and resubmit when ready. If you need help, reply to this email and our team will assist.'],
      },
    ],
  });

  return { subject, text, html };
}

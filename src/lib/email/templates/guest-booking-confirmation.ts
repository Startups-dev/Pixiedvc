import { renderEmailLayout, renderTextList, textLine } from '@/lib/email/templates/layout';

type GuestBookingConfirmationTemplateInput = {
  name?: string | null;
  resortName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  tripUrl?: string | null;
};

export function buildGuestBookingConfirmationTemplate({
  name,
  resortName,
  checkIn,
  checkOut,
  tripUrl,
}: GuestBookingConfirmationTemplateInput) {
  const subject = 'We received your HannaDVC stay request';
  const guestName = name?.trim() || 'HannaDVC guest';
  const resort = resortName?.trim() || 'your preferred resort';
  const dates =
    checkIn && checkOut ? `${checkIn} to ${checkOut}` : checkIn || checkOut || 'your requested dates';
  const ctaUrl = tripUrl?.trim() || null;

  const text = [
    `Hi ${guestName},`,
    '',
    'We received your stay request and our concierge team is reviewing it now.',
    '',
    renderTextList([textLine('Resort', resort), textLine('Dates', dates)]),
    '',
    'No payment is required at this stage.',
    'We will email you as soon as we have an update.',
    ctaUrl ? `View your request: ${ctaUrl}` : null,
    '',
    'HannaDVC Team',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const html = renderEmailLayout({
    title: 'Your request is in review',
    intro: `Hi ${guestName}, we received your stay request and our concierge team is reviewing it now.`,
    sections: [
      {
        title: 'Stay details',
        lines: [textLine('Resort', resort), textLine('Dates', dates)],
      },
      {
        lines: ['No payment is required at this stage.', 'We will email you as soon as we have an update.'],
      },
    ],
    ctaLabel: ctaUrl ? 'View Request' : null,
    ctaUrl,
  });

  return { subject, text, html };
}

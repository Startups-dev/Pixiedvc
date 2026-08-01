import { renderEmailLayout, renderTextList, textLine } from '@/lib/email/templates/layout';

type OwnerMatchWaitingTemplateInput = {
  ownerName?: string | null;
  guestName?: string | null;
  resortName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  points?: number | null;
  manageUrl?: string | null;
  acceptUrl?: string | null;
  declineUrl?: string | null;
};

export function buildOwnerMatchWaitingTemplate({
  ownerName,
  guestName,
  resortName,
  checkIn,
  checkOut,
  points,
  manageUrl,
  acceptUrl,
  declineUrl,
}: OwnerMatchWaitingTemplateInput) {
  const resort = resortName?.trim() || 'your resort';
  const subject = resortName ? `Guest request waiting at ${resort}` : 'New HannaDVC guest request to review';
  const name = ownerName?.trim() || 'HannaDVC owner';
  const guest = guestName?.trim() || 'a guest';
  const dates =
    checkIn && checkOut ? `${checkIn} to ${checkOut}` : checkIn || checkOut || 'the requested dates';
  const pointsLabel = typeof points === 'number' && Number.isFinite(points) ? `${points.toLocaleString()} pts` : '—';
  const primaryUrl = acceptUrl?.trim() || manageUrl?.trim() || null;

  const text = [
    `Hi ${name},`,
    '',
    `A guest request is waiting for your review at ${resort}.`,
    '',
    renderTextList([
      textLine('Guest', guest),
      textLine('Dates', dates),
      textLine('Points needed', pointsLabel),
    ]),
    '',
    'Please respond within 24 hours so we can keep the booking moving.',
    primaryUrl ? `Accept request: ${primaryUrl}` : null,
    declineUrl?.trim() ? `Decline request: ${declineUrl.trim()}` : null,
    !primaryUrl && !declineUrl?.trim() ? 'Log in to the HannaDVC owner dashboard to accept or decline.' : null,
    '',
    'HannaDVC Team',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const declineHtml = declineUrl?.trim()
    ? `<p style="margin:0;font-size:14px;line-height:1.7;color:#31445b;">If you need to decline, use this link: <a href="${declineUrl.trim()}" style="color:#163566;text-decoration:underline;">Decline request</a>.</p>`
    : '';

  const fallbackHtml =
    !primaryUrl && !declineUrl?.trim()
      ? '<p style="margin:0;font-size:15px;line-height:1.7;color:#31445b;">Log in to the HannaDVC owner dashboard to accept or decline.</p>'
      : '';

  const html = renderEmailLayout({
    title: 'A guest request is waiting',
    intro: `Hi ${name}, we found ${guest} for a ${resort} stay and need your response within 24 hours.`,
    sections: [
      {
        title: 'Request details',
        lines: [textLine('Guest', guest), textLine('Dates', dates), textLine('Points needed', pointsLabel)],
      },
      {
        html: `${declineHtml}${fallbackHtml}`,
      },
    ],
    ctaLabel: primaryUrl ? 'Review Request' : null,
    ctaUrl: primaryUrl,
  });

  return { subject, text, html };
}

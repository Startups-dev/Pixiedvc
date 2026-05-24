import { renderEmailLayout, renderTextList, textLine } from '@/lib/email/templates/layout';

type OwnerMatchWaitingReminderTemplateInput = {
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

export function buildOwnerMatchWaitingReminderTemplate({
  ownerName,
  guestName,
  resortName,
  checkIn,
  checkOut,
  points,
  manageUrl,
  acceptUrl,
  declineUrl,
}: OwnerMatchWaitingReminderTemplateInput) {
  const resort = resortName?.trim() || 'your resort';
  const subject = resortName
    ? `Reminder: guest request waiting at ${resort}`
    : 'Reminder: PixieDVC guest request awaiting your response';
  const name = ownerName?.trim() || 'PixieDVC owner';
  const guest = guestName?.trim() || 'a guest';
  const dates =
    checkIn && checkOut ? `${checkIn} to ${checkOut}` : checkIn || checkOut || 'the requested dates';
  const pointsLabel = typeof points === 'number' && Number.isFinite(points) ? `${points.toLocaleString()} pts` : '—';
  const primaryUrl = acceptUrl?.trim() || manageUrl?.trim() || null;

  const text = [
    `Hi ${name},`,
    '',
    'Just a quick reminder that this guest request is still waiting for your response.',
    '',
    renderTextList([
      textLine('Guest', guest),
      textLine('Resort', resort),
      textLine('Dates', dates),
      textLine('Points needed', pointsLabel),
    ]),
    '',
    'A quick response helps us keep the guest updated.',
    primaryUrl ? `Accept request: ${primaryUrl}` : null,
    declineUrl?.trim() ? `Decline request: ${declineUrl.trim()}` : null,
    !primaryUrl && !declineUrl?.trim() ? 'Log in to the PixieDVC owner dashboard to accept or decline.' : null,
    '',
    'PixieDVC Concierge',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const declineHtml = declineUrl?.trim()
    ? `<p style="margin:0;font-size:14px;line-height:1.7;color:#31445b;">If this stay is not a fit, you can <a href="${declineUrl.trim()}" style="color:#163566;text-decoration:underline;">decline the request here</a>.</p>`
    : '';

  const fallbackHtml =
    !primaryUrl && !declineUrl?.trim()
      ? '<p style="margin:0;font-size:15px;line-height:1.7;color:#31445b;">Log in to the PixieDVC owner dashboard to accept or decline.</p>'
      : '';

  const html = renderEmailLayout({
    title: 'A guest request is still waiting',
    intro: `Hi ${name}, just a quick reminder that ${guest} is still waiting on your response for a ${resort} stay.`,
    sections: [
      {
        title: 'Request details',
        lines: [
          textLine('Guest', guest),
          textLine('Resort', resort),
          textLine('Dates', dates),
          textLine('Points needed', pointsLabel),
        ],
      },
      {
        html: `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#31445b;">A quick response helps us keep the guest updated.</p>${declineHtml}${fallbackHtml}`,
      },
    ],
    ctaLabel: primaryUrl ? 'Respond to Request' : null,
    ctaUrl: primaryUrl,
  });

  return { subject, text, html };
}

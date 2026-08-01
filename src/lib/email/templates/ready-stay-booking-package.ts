import { renderEmailLayout, renderTextList, textLine } from '@/lib/email/templates/layout';

type ReadyStayGuest = {
  name: string;
  ageCategory?: string | null;
  age?: number | null;
  email?: string | null;
  phone?: string | null;
};

type ReadyStayBookingPackageTemplateInput = {
  ownerName?: string | null;
  resortName?: string | null;
  roomType?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  points?: number | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  accessibilityRequired?: boolean;
  notes?: string | null;
  guests?: ReadyStayGuest[];
  transferUrl?: string | null;
};

function renderGuestText(guests: ReadyStayGuest[]) {
  if (!guests.length) return 'No additional guests provided.';

  return guests
    .map((guest, index) => {
      const details = [
        guest.ageCategory?.trim() ? `type: ${guest.ageCategory.trim()}` : null,
        typeof guest.age === 'number' ? `age: ${guest.age}` : null,
        guest.email?.trim() ? `email: ${guest.email.trim()}` : null,
        guest.phone?.trim() ? `phone: ${guest.phone.trim()}` : null,
      ].filter(Boolean);

      return `${index + 1}. ${guest.name}${details.length ? ` (${details.join(', ')})` : ''}`;
    })
    .join('\n');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderGuestHtml(guests: ReadyStayGuest[]) {
  if (!guests.length) {
    return '<p style="margin:0;font-size:15px;line-height:1.7;color:#31445b;">No additional guests provided.</p>';
  }

  const items = guests
    .map((guest) => {
      const details = [
        guest.ageCategory?.trim() ? `type: ${guest.ageCategory.trim()}` : null,
        typeof guest.age === 'number' ? `age: ${guest.age}` : null,
        guest.email?.trim() ? `email: ${guest.email.trim()}` : null,
        guest.phone?.trim() ? `phone: ${guest.phone.trim()}` : null,
      ].filter(Boolean);

      return `<li style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#31445b;"><strong>${escapeHtml(
        guest.name,
      )}</strong>${details.length ? ` <span style="color:#63758c;">(${escapeHtml(details.join(', '))})</span>` : ''}</li>`;
    })
    .join('');

  return `<ol style="margin:0;padding-left:20px;">${items}</ol>`;
}

export function buildReadyStayBookingPackageTemplate({
  ownerName,
  resortName,
  roomType,
  checkIn,
  checkOut,
  points,
  guestName,
  guestEmail,
  guestPhone,
  accessibilityRequired,
  notes,
  guests = [],
  transferUrl,
}: ReadyStayBookingPackageTemplateInput) {
  const subject = 'HannaDVC - Ready Stay booking package';
  const name = ownerName?.trim() || 'Owner';
  const dates =
    checkIn && checkOut ? `${checkIn} to ${checkOut}` : checkIn || checkOut || '—';
  const pointsLabel = typeof points === 'number' && Number.isFinite(points) ? `${points.toLocaleString()}` : '—';
  const cleanNotes = notes?.trim() || '—';
  const ctaUrl = transferUrl?.trim() || null;

  const text = [
    `Hi ${name},`,
    '',
    'A Ready Stay has been booked. Please review the booking package and complete the reservation transfer or linking steps.',
    '',
    'Stay details',
    renderTextList([
      textLine('Resort', resortName),
      textLine('Room', roomType),
      textLine('Dates', dates),
      textLine('Points', pointsLabel),
    ]),
    '',
    'Lead guest details',
    renderTextList([
      textLine('Name', guestName),
      textLine('Email', guestEmail),
      textLine('Phone', guestPhone),
      textLine('Accessibility notes', accessibilityRequired ? 'Yes' : 'No'),
      textLine('Notes', cleanNotes),
    ]),
    '',
    'Additional guests',
    renderGuestText(guests),
    '',
    ctaUrl
      ? `Open owner action page: ${ctaUrl}`
      : 'Open the Ready Stays owner dashboard to complete the transfer.',
    '',
    'HannaDVC Team',
  ].join('\n');

  const html = renderEmailLayout({
    title: 'Ready Stay booking package',
    intro: `Hi ${name}, a Ready Stay has been booked and is ready for your transfer or linking steps.`,
    sections: [
      {
        title: 'Stay details',
        lines: [
          textLine('Resort', resortName),
          textLine('Room', roomType),
          textLine('Dates', dates),
          textLine('Points', pointsLabel),
        ],
      },
      {
        title: 'Lead guest details',
        lines: [
          textLine('Name', guestName),
          textLine('Email', guestEmail),
          textLine('Phone', guestPhone),
          textLine('Accessibility notes', accessibilityRequired ? 'Yes' : 'No'),
          textLine('Notes', cleanNotes),
        ],
      },
      {
        title: 'Additional guests',
        html: renderGuestHtml(guests),
      },
      {
        lines: ['Please review the booking package and complete the reservation transfer or linking steps.'],
      },
    ],
    ctaLabel: ctaUrl ? 'Open Owner Dashboard' : null,
    ctaUrl,
  });

  return { subject, text, html };
}

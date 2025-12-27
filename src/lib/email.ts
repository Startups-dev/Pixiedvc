type BookingEmailPayload = {
  to: string;
  name?: string | null;
  resortName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
};

type OwnerMatchEmailPayload = {
  to: string;
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

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL ?? 'bookings@pixiedvc.com';

async function sendResendEmail({
  to,
  subject,
  body,
  context,
}: {
  to: string;
  subject: string;
  body: string;
  context: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY missing, skipping ${context}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: DEFAULT_FROM,
      to,
      subject,
      text: body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn(`[email] Failed to send ${context}`, text);
  }
}

export async function sendPlainEmail({ to, subject, body, context }: { to: string; subject: string; body: string; context: string }) {
  await sendResendEmail({ to, subject, body, context });
}

export async function sendBookingConfirmationEmail(payload: BookingEmailPayload) {
  const subject = 'We received your PixieDVC stay request';
  const name = payload.name || 'PixieDVC guest';
  const dates = payload.checkIn && payload.checkOut ? `${payload.checkIn} → ${payload.checkOut}` : 'your requested dates';
  const resort = payload.resortName ?? 'your preferred resort';
  const body = [
    `Hi ${name},`,
    '',
    'Thanks for submitting your stay details with PixieDVC!',
    `• Resort: ${resort}`,
    `• Dates: ${dates}`,
    '',
    'Our concierge team is pairing you with available owners now. We will email you as soon as we have a match (usually within 24 hours).',
    '',
    'Need to update anything? Reply to this email or contact concierge@pixiedvc.com.',
    '',
    'PixieDVC Concierge',
  ].join('\n');

  await sendResendEmail({
    to: payload.to,
    subject,
    body,
    context: 'confirmation email',
  });
}

export async function sendOwnerMatchEmail(payload: OwnerMatchEmailPayload) {
  const subject = payload.resortName
    ? `Guest request waiting at ${payload.resortName}`
    : 'New PixieDVC guest request to review';
  const ownerName = payload.ownerName ?? 'PixieDVC owner';
  const guestName = payload.guestName ?? 'a guest';
  const resort = payload.resortName ?? 'your resort';
  const dates = payload.checkIn && payload.checkOut ? `${payload.checkIn} → ${payload.checkOut}` : 'the requested dates';
  const pointsLabel = payload.points ? `${payload.points.toLocaleString()} pts` : 'the required points';
  const actionLines: string[] = [];
  if (payload.acceptUrl) {
    actionLines.push(`Accept booking: ${payload.acceptUrl}`);
  }
  if (payload.declineUrl) {
    actionLines.push(`Decline booking: ${payload.declineUrl}`);
  }
  if (!actionLines.length) {
    if (payload.manageUrl) {
      actionLines.push(`Respond now: ${payload.manageUrl}`);
    } else {
      actionLines.push('Log in to the PixieDVC owner portal to accept or decline.');
    }
  }

  const body = [
    `Hi ${ownerName},`,
    '',
    `We found ${guestName} who needs a ${resort} stay (${dates}).`,
    `• Points needed: ${pointsLabel}`,
    '',
    'Please confirm within 24 hours so we can lock in the reservation.',
    '',
    ...actionLines,
    '',
    'Thanks for sharing your points!',
    '',
    'PixieDVC Concierge',
  ].join('\n');

  await sendResendEmail({
    to: payload.to,
    subject,
    body,
    context: 'owner match email',
  });
}

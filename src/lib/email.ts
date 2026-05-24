import { getSupabaseAdminClient } from '@/lib/supabase-admin';

type EmailLogMetadata = Record<string, string | number | boolean | null | undefined>;

type EmailLogContext = {
  templateKey: string;
  recipientUserId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  metadata?: EmailLogMetadata | null;
};

type BookingEmailPayload = {
  to: string;
  name?: string | null;
  resortName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
} & EmailLogContext;

type SendPlainEmailPayload = {
  to: string;
  subject: string;
  body: string;
  context: string;
} & EmailLogContext;

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
} & EmailLogContext;

type ReadyStayBookingPackageEmailPayload = {
  to: string;
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
  guests?: Array<{
    name: string;
    ageCategory?: string | null;
    age?: number | null;
    email?: string | null;
    phone?: string | null;
  }>;
  transferUrl?: string | null;
} & EmailLogContext;

type ConciergeHandoffEmailPayload = {
  conversationId: string;
  name?: string | null;
  email?: string | null;
  message?: string | null;
  pageUrl?: string | null;
  source?: 'escalate' | 'handoff';
} & Partial<EmailLogContext>;

type OwnerAgreementSignedEmailPayload = {
  to: string;
  ownerName?: string | null;
  guestName?: string | null;
  resortName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  rentalUrl?: string | null;
} & EmailLogContext;

type GuestAgreementSignedEmailPayload = {
  to: string;
  guestName?: string | null;
  resortName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  agreementUrl?: string | null;
} & EmailLogContext;

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL ?? 'hello@pixiedvc.com';
const LOCALHOST_EMAIL_URL_RE = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i;

function sanitizeMetadata(metadata?: EmailLogMetadata | null) {
  const entries = Object.entries(metadata ?? {}).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries);
}

async function insertOutboundEmailLog({
  templateKey,
  to,
  recipientUserId,
  relatedEntityType,
  relatedEntityId,
  subject,
  metadata,
}: {
  templateKey: string;
  to: string;
  recipientUserId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  subject: string;
  metadata?: EmailLogMetadata | null;
}) {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from('outbound_emails')
    .insert({
      template_key: templateKey,
      recipient_email: to,
      recipient_user_id: recipientUserId ?? null,
      related_entity_type: relatedEntityType ?? null,
      related_entity_id: relatedEntityId ?? null,
      subject,
      status: 'pending',
      provider: 'resend',
      metadata: sanitizeMetadata(metadata),
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('[email] Failed to create outbound email log', {
      templateKey,
      to,
      error: error.message,
    });
    return null;
  }

  return data?.id ?? null;
}

async function updateOutboundEmailLog(
  id: string | null,
  updates: {
    status: 'sent' | 'failed';
    providerMessageId?: string | null;
    errorMessage?: string | null;
  },
) {
  if (!id) return;

  const admin = getSupabaseAdminClient();
  if (!admin) return;

  const nowIso = new Date().toISOString();
  const payload =
    updates.status === 'sent'
      ? {
          status: 'sent',
          sent_at: nowIso,
          provider_message_id: updates.providerMessageId ?? null,
          error_message: null,
        }
      : {
          status: 'failed',
          failed_at: nowIso,
          error_message: updates.errorMessage ?? 'Unknown email delivery error',
        };

  const { error } = await admin.from('outbound_emails').update(payload).eq('id', id);
  if (error) {
    console.warn('[email] Failed to update outbound email log', {
      id,
      status: updates.status,
      error: error.message,
    });
  }
}

async function sendResendEmail({
  to,
  subject,
  body,
  context,
  templateKey,
  recipientUserId,
  relatedEntityType,
  relatedEntityId,
  metadata,
}: {
  to: string;
  subject: string;
  body: string;
  context: string;
  templateKey: string;
  recipientUserId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  metadata?: EmailLogMetadata | null;
}) {
  const logId = await insertOutboundEmailLog({
    templateKey,
    to,
    recipientUserId,
    relatedEntityType,
    relatedEntityId,
    subject,
    metadata,
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await updateOutboundEmailLog(logId, {
      status: 'failed',
      errorMessage: 'RESEND_API_KEY missing',
    });
    console.warn(`[email] RESEND_API_KEY missing, skipping ${context}`);
    return;
  }

  if (process.env.NODE_ENV === 'production' && LOCALHOST_EMAIL_URL_RE.test(body)) {
    console.warn(`[email] localhost URL detected in outgoing production email (${context})`);
  }

  try {
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
      await updateOutboundEmailLog(logId, {
        status: 'failed',
        errorMessage: text,
      });
      console.warn(`[email] Failed to send ${context}`, text);
      return;
    }

    let providerMessageId: string | null = null;
    try {
      const json = (await response.json()) as { id?: unknown };
      providerMessageId = typeof json?.id === 'string' ? json.id : null;
    } catch {
      providerMessageId = null;
    }

    await updateOutboundEmailLog(logId, {
      status: 'sent',
      providerMessageId,
    });
  } catch (error) {
    await updateOutboundEmailLog(logId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown email delivery error',
    });
    throw error;
  }
}

export async function sendPlainEmail({ to, subject, body, context, templateKey, recipientUserId, relatedEntityType, relatedEntityId, metadata }: SendPlainEmailPayload) {
  await sendResendEmail({
    to,
    subject,
    body,
    context,
    templateKey,
    recipientUserId,
    relatedEntityType,
    relatedEntityId,
    metadata,
  });
}

export async function sendConciergeHandoffNotification(payload: ConciergeHandoffEmailPayload) {
  const to = process.env.CONCIERGE_HANDOFF_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? 'hello@pixiedvc.com';
  const subject = 'New Concierge Request';
  const body = [
    'A guest requested concierge support.',
    '',
    `Conversation ID: ${payload.conversationId}`,
    `Source: ${payload.source ?? 'handoff'}`,
    `Timestamp: ${new Date().toISOString()}`,
    `Name: ${payload.name?.trim() || '—'}`,
    `Email: ${payload.email?.trim() || '—'}`,
    `Page: ${payload.pageUrl?.trim() || '—'}`,
    '',
    'Message:',
    payload.message?.trim() || '—',
  ].join('\n');

  await sendResendEmail({
    to,
    subject,
    body,
    context: 'concierge handoff notification',
    templateKey: payload.source === 'escalate' ? 'support_escalation' : 'concierge_handoff',
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType ?? 'support_conversation',
    relatedEntityId: payload.relatedEntityId ?? payload.conversationId,
    metadata: {
      ...(payload.metadata ?? {}),
      source: payload.source ?? 'handoff',
    },
  });
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
    'Need to update anything? Reply to this email or contact hello@pixiedvc.com.',
    '',
    'PixieDVC Concierge',
  ].join('\n');

  await sendResendEmail({
    to: payload.to,
    subject,
    body,
    context: 'confirmation email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
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
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
  });
}

export async function sendOwnerAgreementSignedEmail(payload: OwnerAgreementSignedEmailPayload) {
  const subject = 'PixieDVC – Guest signed the rental agreement';
  const ownerName = payload.ownerName ?? 'PixieDVC owner';
  const guestName = payload.guestName ?? 'the guest';
  const resort = payload.resortName ?? 'your resort';
  const dates = payload.checkIn && payload.checkOut ? `${payload.checkIn} → ${payload.checkOut}` : 'the requested dates';
  const actionLine = payload.rentalUrl
    ? `View agreement: ${payload.rentalUrl}`
    : 'View the agreement in your PixieDVC owner dashboard.';

  const body = [
    `Hi ${ownerName},`,
    '',
    `${guestName} has signed the rental agreement for ${resort} (${dates}).`,
    '',
    actionLine,
    '',
    'No signature is required from you. We will keep you updated on next steps.',
    '',
    'PixieDVC Concierge',
  ].join('\n');

  await sendResendEmail({
    to: payload.to,
    subject,
    body,
    context: 'owner agreement signed email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
  });
}

export async function sendGuestAgreementSignedEmail(payload: GuestAgreementSignedEmailPayload) {
  const subject = 'PixieDVC – Your signed rental agreement';
  const guestName = payload.guestName ?? 'there';
  const agreementLine = payload.agreementUrl
    ? payload.agreementUrl
    : 'A copy of your signed agreement is available in your PixieDVC trip details.';

  const body = [
    `Hi ${guestName},`,
    '',
    'Your PixieDVC rental agreement has been successfully signed and finalized.',
    '',
    'For your records, you can view or download a copy of your signed agreement using the link below:',
    agreementLine,
    '',
    'If you have any questions about your reservation or need assistance at any point, our concierge team is here to help.',
    '',
    'Warm regards,',
    'PixieDVC Concierge',
    'hello@pixiedvc.com',
  ].join('\n');

  await sendResendEmail({
    to: payload.to,
    subject,
    body,
    context: 'guest agreement signed email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
  });
}

export async function sendReadyStayBookingPackageToOwner(payload: ReadyStayBookingPackageEmailPayload) {
  const subject = 'PixieDVC – Ready Stay booking package';
  const ownerName = payload.ownerName ?? 'Owner';
  const guests = payload.guests ?? [];

  const guestLines =
    guests.length > 0
      ? guests
          .map((guest, index) => {
            const detailParts = [
              guest.ageCategory ? `type: ${guest.ageCategory}` : null,
              typeof guest.age === 'number' ? `age: ${guest.age}` : null,
              guest.email ? `email: ${guest.email}` : null,
              guest.phone ? `phone: ${guest.phone}` : null,
            ].filter(Boolean);
            return `${index + 1}. ${guest.name}${detailParts.length ? ` (${detailParts.join(', ')})` : ''}`;
          })
          .join('\n')
      : 'No additional guests provided.';

  const body = [
    `Hi ${ownerName},`,
    '',
    'A Ready Stay has been paid in full and is waiting for transfer confirmation.',
    '',
    'Stay details',
    `• Resort: ${payload.resortName ?? '—'}`,
    `• Room: ${payload.roomType ?? '—'}`,
    `• Dates: ${payload.checkIn ?? '—'} → ${payload.checkOut ?? '—'}`,
    `• Points: ${payload.points ?? '—'}`,
    '',
    'Guest details',
    `• Lead guest: ${payload.guestName ?? '—'}`,
    `• Email: ${payload.guestEmail ?? '—'}`,
    `• Phone: ${payload.guestPhone ?? '—'}`,
    `• Accessibility notes: ${payload.accessibilityRequired ? 'Yes' : 'No'}`,
    `• Notes: ${payload.notes && payload.notes.trim() ? payload.notes.trim() : '—'}`,
    '',
    'Additional guests',
    guestLines,
    '',
    payload.transferUrl
      ? `Confirm transfer here: ${payload.transferUrl}`
      : 'Open the Ready Stays owner page to confirm transfer.',
    '',
    'PixieDVC Concierge',
  ].join('\n');

  await sendResendEmail({
    to: payload.to,
    subject,
    body,
    context: 'ready stay booking package email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
  });
}

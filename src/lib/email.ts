import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { buildConciergeHandoffTemplate } from '@/lib/email/templates/concierge-handoff';
import { buildContractGuestAgreementTemplate } from '@/lib/email/templates/contract-guest-agreement';
import { buildContractOwnerAgreementTemplate } from '@/lib/email/templates/contract-owner-agreement';
import { buildGuestBookingConfirmationTemplate } from '@/lib/email/templates/guest-booking-confirmation';
import { buildGuestAgreementSignedTemplate } from '@/lib/email/templates/guest-agreement-signed';
import { buildOwnerMatchWaitingTemplate } from '@/lib/email/templates/owner-match-waiting';
import { buildOwnerAgreementSignedTemplate } from '@/lib/email/templates/owner-agreement-signed';
import { buildReadyStayBookingPackageTemplate } from '@/lib/email/templates/ready-stay-booking-package';
import { buildReadyStayLinkReadyTemplate } from '@/lib/email/templates/ready-stay-link-ready';
import { buildReadyStayRejectedTemplate } from '@/lib/email/templates/ready-stay-rejected';
import { buildSupportEscalationTemplate } from '@/lib/email/templates/support-escalation';

type EmailLogMetadata = Record<string, string | number | boolean | null | undefined>;

type EmailLogContext = {
  templateKey: string;
  recipientUserId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  metadata?: EmailLogMetadata | null;
  outboundEmailLogId?: string | null;
};

type BookingEmailPayload = {
  to: string;
  name?: string | null;
  resortName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  tripUrl?: string | null;
} & EmailLogContext;

type SendPlainEmailPayload = {
  to: string;
  subject: string;
  body: string;
  html?: string;
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

type ContractOwnerAgreementEmailPayload = {
  to: string;
  ownerName?: string | null;
  guestName?: string | null;
  resortName?: string | null;
  roomType?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  points?: number | null;
  totalUsd?: string | null;
  agreementUrl?: string | null;
} & EmailLogContext;

type ContractGuestAgreementEmailPayload = {
  to: string;
  guestName?: string | null;
  resortName?: string | null;
  roomType?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  points?: number | null;
  totalUsd?: string | null;
  paidNowUsd?: string | null;
  agreementUrl?: string | null;
} & EmailLogContext;

type ReadyStayLinkReadyEmailPayload = {
  to: string;
  guestName?: string | null;
  confirmationNumber?: string | null;
  tripUrl?: string | null;
} & EmailLogContext;

type ReadyStayRejectedEmailPayload = {
  to: string;
  ownerName?: string | null;
  resortName?: string | null;
  roomType?: string | null;
  dates?: string | null;
  reason?: string | null;
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
  text,
  html,
  context,
  templateKey,
  recipientUserId,
  relatedEntityType,
  relatedEntityId,
  metadata,
  outboundEmailLogId,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  context: string;
  templateKey: string;
  recipientUserId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  metadata?: EmailLogMetadata | null;
  outboundEmailLogId?: string | null;
}) {
  const logId =
    outboundEmailLogId ??
    (await insertOutboundEmailLog({
      templateKey,
      to,
      recipientUserId,
      relatedEntityType,
      relatedEntityId,
      subject,
      metadata,
    }));

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await updateOutboundEmailLog(logId, {
      status: 'failed',
      errorMessage: 'RESEND_API_KEY missing',
    });
    console.warn(`[email] RESEND_API_KEY missing, skipping ${context}`);
    return;
  }

  if (
    process.env.NODE_ENV === 'production' &&
    (LOCALHOST_EMAIL_URL_RE.test(text) || (html ? LOCALHOST_EMAIL_URL_RE.test(html) : false))
  ) {
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
        text,
        html: html ?? undefined,
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

export async function sendPlainEmail({
  to,
  subject,
  body,
  html,
  context,
  templateKey,
  recipientUserId,
  relatedEntityType,
  relatedEntityId,
  metadata,
  outboundEmailLogId,
}: SendPlainEmailPayload) {
  await sendResendEmail({
    to,
    subject,
    text: body,
    html,
    context,
    templateKey,
    recipientUserId,
    relatedEntityType,
    relatedEntityId,
    metadata,
    outboundEmailLogId,
  });
}

export async function sendConciergeHandoffNotification(payload: ConciergeHandoffEmailPayload) {
  const to = process.env.CONCIERGE_HANDOFF_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? 'hello@pixiedvc.com';
  const template =
    payload.source === 'escalate'
      ? buildSupportEscalationTemplate({
          conversationId: payload.conversationId,
          name: payload.name,
          email: payload.email,
          message: payload.message,
          pageUrl: payload.pageUrl,
        })
      : buildConciergeHandoffTemplate({
          conversationId: payload.conversationId,
          name: payload.name,
          email: payload.email,
          message: payload.message,
          pageUrl: payload.pageUrl,
        });

  await sendResendEmail({
    to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    context: 'concierge handoff notification',
    templateKey: payload.source === 'escalate' ? 'support_escalation' : 'concierge_handoff',
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType ?? 'support_conversation',
    relatedEntityId: payload.relatedEntityId ?? payload.conversationId,
    metadata: {
      ...(payload.metadata ?? {}),
      source: payload.source ?? 'handoff',
    },
    outboundEmailLogId: payload.outboundEmailLogId,
  });
}

export async function sendContractOwnerAgreementEmail(payload: ContractOwnerAgreementEmailPayload) {
  const template = buildContractOwnerAgreementTemplate({
    ownerName: payload.ownerName,
    guestName: payload.guestName,
    resortName: payload.resortName,
    roomType: payload.roomType,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    points: payload.points,
    totalUsd: payload.totalUsd,
    agreementUrl: payload.agreementUrl,
  });

  await sendResendEmail({
    to: payload.to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    context: 'contract owner email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
    outboundEmailLogId: payload.outboundEmailLogId,
  });
}

export async function sendContractGuestAgreementEmail(payload: ContractGuestAgreementEmailPayload) {
  const template = buildContractGuestAgreementTemplate({
    guestName: payload.guestName,
    resortName: payload.resortName,
    roomType: payload.roomType,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    points: payload.points,
    totalUsd: payload.totalUsd,
    paidNowUsd: payload.paidNowUsd,
    agreementUrl: payload.agreementUrl,
  });

  await sendResendEmail({
    to: payload.to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    context: 'contract guest email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
    outboundEmailLogId: payload.outboundEmailLogId,
  });
}

export async function sendBookingConfirmationEmail(payload: BookingEmailPayload) {
  const template = buildGuestBookingConfirmationTemplate({
    name: payload.name,
    resortName: payload.resortName,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    tripUrl: payload.tripUrl,
  });

  await sendResendEmail({
    to: payload.to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    context: 'confirmation email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
    outboundEmailLogId: payload.outboundEmailLogId,
  });
}

export async function sendOwnerMatchEmail(payload: OwnerMatchEmailPayload) {
  const template = buildOwnerMatchWaitingTemplate({
    ownerName: payload.ownerName,
    guestName: payload.guestName,
    resortName: payload.resortName,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    points: payload.points,
    manageUrl: payload.manageUrl,
    acceptUrl: payload.acceptUrl,
    declineUrl: payload.declineUrl,
  });

  await sendResendEmail({
    to: payload.to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    context: 'owner match email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
    outboundEmailLogId: payload.outboundEmailLogId,
  });
}

export async function sendOwnerAgreementSignedEmail(payload: OwnerAgreementSignedEmailPayload) {
  const template = buildOwnerAgreementSignedTemplate({
    ownerName: payload.ownerName,
    guestName: payload.guestName,
    resortName: payload.resortName,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    rentalUrl: payload.rentalUrl,
  });

  await sendResendEmail({
    to: payload.to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    context: 'owner agreement signed email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
    outboundEmailLogId: payload.outboundEmailLogId,
  });
}

export async function sendGuestAgreementSignedEmail(payload: GuestAgreementSignedEmailPayload) {
  const template = buildGuestAgreementSignedTemplate({
    guestName: payload.guestName,
    resortName: payload.resortName,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    agreementUrl: payload.agreementUrl,
  });

  await sendResendEmail({
    to: payload.to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    context: 'guest agreement signed email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
    outboundEmailLogId: payload.outboundEmailLogId,
  });
}

export async function sendReadyStayLinkReadyEmail(payload: ReadyStayLinkReadyEmailPayload) {
  const template = buildReadyStayLinkReadyTemplate({
    guestName: payload.guestName,
    confirmationNumber: payload.confirmationNumber,
    tripUrl: payload.tripUrl,
  });

  await sendResendEmail({
    to: payload.to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    context: 'ready stay transfer link-ready email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
    outboundEmailLogId: payload.outboundEmailLogId,
  });
}

export async function sendReadyStayRejectedEmail(payload: ReadyStayRejectedEmailPayload) {
  const template = buildReadyStayRejectedTemplate({
    ownerName: payload.ownerName,
    resortName: payload.resortName,
    roomType: payload.roomType,
    dates: payload.dates,
    reason: payload.reason,
  });

  await sendResendEmail({
    to: payload.to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    context: 'ready stay rejection email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
    outboundEmailLogId: payload.outboundEmailLogId,
  });
}

export async function sendReadyStayBookingPackageToOwner(payload: ReadyStayBookingPackageEmailPayload) {
  const template = buildReadyStayBookingPackageTemplate({
    ownerName: payload.ownerName,
    resortName: payload.resortName,
    roomType: payload.roomType,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    points: payload.points,
    guestName: payload.guestName,
    guestEmail: payload.guestEmail,
    guestPhone: payload.guestPhone,
    accessibilityRequired: payload.accessibilityRequired,
    notes: payload.notes,
    guests: payload.guests,
    transferUrl: payload.transferUrl,
  });

  await sendResendEmail({
    to: payload.to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    context: 'ready stay booking package email',
    templateKey: payload.templateKey,
    recipientUserId: payload.recipientUserId,
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
    metadata: payload.metadata,
    outboundEmailLogId: payload.outboundEmailLogId,
  });
}

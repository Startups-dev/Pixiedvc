import { getAppUrl } from "@/lib/app-url";
import { sendPlainEmail } from "@/lib/email";

type NotificationContext = {
  idempotencyKey: string;
  applicationId?: string;
  affiliateId?: string;
  payoutItemId?: string;
  conversationId?: string | null;
  recipientUserId?: string | null;
  outboundEmailLogId?: string | null;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function htmlParagraphs(text: string) {
  return text.split("\n\n").map((paragraph) => {
    const escaped = escapeHtml(paragraph).replace(/\n/g, "<br>");
    const linked = escaped.replace(/https:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#10224a;text-decoration:underline">${url}</a>`);
    return `<p>${linked}</p>`;
  }).join("");
}

function appUrl(path: string) {
  return getAppUrl(path, "affiliate communication link") ?? `https://hannadvc.com${path}`;
}

async function sendAffiliateEmail({
  to,
  subject,
  body,
  templateKey,
  context,
  notification,
  staff = false,
}: {
  to: string;
  subject: string;
  body: string;
  templateKey: string;
  context: string;
  notification: NotificationContext;
  staff?: boolean;
}) {
  const relatedEntityType = staff
    ? "affiliate_application"
    : notification.conversationId
      ? "support_conversation"
      : notification.payoutItemId
        ? "affiliate_payout_item"
        : "affiliate_application";
  const relatedEntityId = staff
    ? notification.applicationId ?? null
    : notification.conversationId ?? notification.payoutItemId ?? notification.applicationId ?? null;
  const metadata = {
    notification_key: notification.idempotencyKey,
    affiliate_application_id: notification.applicationId ?? null,
    affiliate_id: notification.affiliateId ?? null,
    payout_item_id: notification.payoutItemId ?? null,
    source: "affiliate_communication",
    inbox_email_threading: !staff && Boolean(notification.conversationId),
  };

  return sendPlainEmail({
    to,
    subject,
    body,
    html: htmlParagraphs(body),
    context,
    templateKey,
    recipientUserId: staff ? null : notification.recipientUserId,
    relatedEntityType,
    relatedEntityId,
    metadata,
    outboundEmailLogId: notification.outboundEmailLogId,
    replyTo: staff ? undefined : "hello@hannadvc.com",
    idempotencyKey: notification.idempotencyKey,
  });
}

export function sendAffiliateApplicationAcknowledgment(input: {
  to: string; name: string; applicationId: string; conversationId?: string | null; outboundEmailLogId?: string | null;
}) {
  const body = `Hi ${input.name},\n\nThanks for applying to the HannaDVC Affiliate Program. We’ve received your application and our team will review it. You can reply to this email if you need to add context.\n\nHannaDVC`;
  return sendAffiliateEmail({
    to: input.to, subject: "We received your HannaDVC affiliate application", body,
    templateKey: "affiliate_application_acknowledgment", context: "affiliate application acknowledgment",
    notification: { idempotencyKey: `affiliate-application-ack-${input.applicationId}`, applicationId: input.applicationId, conversationId: input.conversationId, outboundEmailLogId: input.outboundEmailLogId },
  });
}
export function sendAffiliateApplicationStaffAlert(input: {
  to: string; applicantName: string; applicationId: string; outboundEmailLogId?: string | null;
}) {
  const reviewUrl = appUrl(`/admin/affiliates/applications?application=${encodeURIComponent(input.applicationId)}`);
  const body = `A new affiliate application was submitted by ${input.applicantName}.\n\nReview the application: ${reviewUrl}`;
  return sendAffiliateEmail({
    to: input.to, subject: "New HannaDVC affiliate application", body,
    templateKey: "affiliate_application_staff_alert", context: "affiliate application staff alert", staff: true,
    notification: { idempotencyKey: `affiliate-application-staff-${input.applicationId}`, applicationId: input.applicationId, outboundEmailLogId: input.outboundEmailLogId },
  });
}

export function sendAffiliateWelcome(input: {
  to: string; name: string; applicationId: string; affiliateId: string; conversationId?: string | null; recipientUserId?: string | null; outboundEmailLogId?: string | null; accessUrl?: string | null;
}) {
  const loginUrl = appUrl("/affiliate/login");
  const accessInstructions = input.accessUrl
    ? `Continue to your affiliate account using this secure link: ${input.accessUrl}`
    : `You can sign in to your affiliate dashboard here: ${loginUrl}\n\nIf you need to set or reset your password, choose “Forgot password” on the sign-in page.`;
  const body = `Hi ${input.name},\n\nYour HannaDVC affiliate application has been approved.\n\n${accessInstructions}\n\nYour referral link, performance, and payout records are available in the dashboard. You can reply to this email if you need help.\n\nWelcome,\nHannaDVC`;
  return sendAffiliateEmail({
    to: input.to, subject: "Welcome to the HannaDVC Affiliate Program", body,
    templateKey: "affiliate_approval_welcome", context: "affiliate approval welcome",
    notification: { idempotencyKey: `affiliate-approval-welcome-${input.applicationId}`, applicationId: input.applicationId, affiliateId: input.affiliateId, conversationId: input.conversationId, recipientUserId: input.recipientUserId, outboundEmailLogId: input.outboundEmailLogId },
  });
}

export function sendAffiliateRejection(input: {
  to: string; name: string; applicationId: string; conversationId?: string | null; outboundEmailLogId?: string | null;
}) {
  const body = `Hi ${input.name},\n\nThank you for applying to the HannaDVC Affiliate Program and for sharing your plans with us. After reviewing your application, we’re unable to approve it at this time. We appreciate your interest and wish you the best. If you have a question, you can reply to this email.\n\nHannaDVC`;
  return sendAffiliateEmail({
    to: input.to, subject: "An update on your HannaDVC affiliate application", body,
    templateKey: "affiliate_application_rejection", context: "affiliate application decision",
    notification: { idempotencyKey: `affiliate-application-rejection-${input.applicationId}`, applicationId: input.applicationId, conversationId: input.conversationId, outboundEmailLogId: input.outboundEmailLogId },
  });
}

export function sendAffiliatePayoutPaid(input: {
  to: string; name: string; amountUsd: number; payoutItemId: string; affiliateId: string; conversationId?: string | null; recipientUserId?: string | null; outboundEmailLogId?: string | null;
}) {
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(input.amountUsd);
  const body = `Hi ${input.name},\n\nYour HannaDVC affiliate payout of ${amount} USD has been marked paid. The payout reference and date are available in your dashboard: ${appUrl("/affiliate/dashboard#payout-history")}\n\nIf you have a question, reply to this email.\n\nHannaDVC`;
  return sendAffiliateEmail({
    to: input.to, subject: `Your HannaDVC affiliate payout of ${amount} USD`, body,
    templateKey: "affiliate_payout_paid", context: "affiliate payout confirmation",
    notification: { idempotencyKey: `affiliate-payout-paid-${input.payoutItemId}`, payoutItemId: input.payoutItemId, affiliateId: input.affiliateId, conversationId: input.conversationId, recipientUserId: input.recipientUserId, outboundEmailLogId: input.outboundEmailLogId },
  });
}

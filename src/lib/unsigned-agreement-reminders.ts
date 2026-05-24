import { getAppUrl } from '@/lib/app-url';
import {
  sendContractGuestAgreementReminderEmail,
  sendContractOwnerAgreementReminderEmail,
} from '@/lib/email';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import type { ContractSnapshot } from '@/lib/contracts/contractSnapshot';

const OWNER_TEMPLATE_KEY = 'contract_owner_agreement_reminder';
const GUEST_TEMPLATE_KEY = 'contract_guest_agreement_reminder';
const ORIGINAL_OWNER_TEMPLATE_KEY = 'contract_owner_agreement';
const ORIGINAL_GUEST_TEMPLATE_KEY = 'contract_guest_agreement';
const DEFAULT_REMINDER_HOURS = 24;
const MAX_CANDIDATES_PER_RUN = 50;
const VALID_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

type ContractRow = {
  id: number;
  owner_id: string | null;
  booking_request_id: string | null;
  status: string | null;
  sent_at: string | null;
  owner_accept_token: string | null;
  guest_accept_token: string | null;
  owner_accepted_at: string | null;
  guest_accepted_at: string | null;
  snapshot: ContractSnapshot | null;
};

type OutboundEmailRow = {
  id: string;
  template_key: string;
  status: string | null;
  related_entity_id: string | null;
  created_at: string | null;
  sent_at: string | null;
  metadata: Record<string, unknown> | null;
};

type PartyTarget = {
  role: 'owner' | 'guest';
  templateKey: typeof OWNER_TEMPLATE_KEY | typeof GUEST_TEMPLATE_KEY;
  originalTemplateKey: typeof ORIGINAL_OWNER_TEMPLATE_KEY | typeof ORIGINAL_GUEST_TEMPLATE_KEY;
  email: string | null;
  signUrl: string | null;
};

export type UnsignedAgreementReminderResult = {
  ok: boolean;
  now: string;
  reminderHours: number;
  candidates: number;
  sent: number;
  skipped: Array<{ contractId: number; role?: 'owner' | 'guest'; reason: string }>;
  errors: Array<{ contractId?: number; role?: 'owner' | 'guest'; message: string }>;
};

function parseReminderHours() {
  const raw = process.env.UNSIGNED_AGREEMENT_REMINDER_HOURS;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_REMINDER_HOURS;
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_REMINDER_HOURS;
}

function parseIso(value: string | null | undefined) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function hasValidEmail(email: string | null | undefined) {
  return VALID_EMAIL_RE.test(email?.trim() ?? '');
}

function matchesContractId(log: OutboundEmailRow, contractId: number) {
  if (log.related_entity_id === String(contractId)) return true;
  const metadata = (log.metadata ?? {}) as Record<string, unknown>;
  return metadata.contractId === contractId || metadata.contractId === String(contractId);
}

function buildEmailIndex(rows: OutboundEmailRow[], templateKey: string, contractId: number) {
  return rows.filter((row) => row.template_key === templateKey && matchesContractId(row, contractId));
}

function earliestSentOrCreated(rows: OutboundEmailRow[]) {
  let earliest: number | null = null;
  for (const row of rows) {
    if (row.status !== 'sent') continue;
    const ts = parseIso(row.sent_at ?? row.created_at);
    if (ts === null) continue;
    if (earliest === null || ts < earliest) earliest = ts;
  }
  return earliest;
}

function hasReminder(rows: OutboundEmailRow[]) {
  return rows.some((row) => row.status === 'sent' || row.status === 'pending' || row.status === 'failed');
}

function resolveOwnerEmail(snapshot: ContractSnapshot | null | undefined) {
  return (
    snapshot?.parties?.owner?.email?.trim() ||
    snapshot?.ownerEmail?.trim() ||
    null
  );
}

function resolveOwnerName(snapshot: ContractSnapshot | null | undefined) {
  return (
    snapshot?.parties?.owner?.fullName?.trim() ||
    snapshot?.ownerName?.trim() ||
    'PixieDVC owner'
  );
}

function resolveGuestEmail(snapshot: ContractSnapshot | null | undefined) {
  return (
    snapshot?.parties?.guest?.email?.trim() ||
    snapshot?.guestEmail?.trim() ||
    snapshot?.renterEmail?.trim() ||
    null
  );
}

function resolveGuestName(snapshot: ContractSnapshot | null | undefined) {
  return (
    snapshot?.parties?.guest?.fullName?.trim() ||
    snapshot?.renterName?.trim() ||
    'PixieDVC guest'
  );
}

function createPartyTargets(contract: ContractRow): PartyTarget[] {
  const targets: PartyTarget[] = [];
  if (contract.status !== 'sent') return targets;

  const snapshot = contract.snapshot;

  if (!contract.owner_accepted_at) {
    targets.push({
      role: 'owner',
      templateKey: OWNER_TEMPLATE_KEY,
      originalTemplateKey: ORIGINAL_OWNER_TEMPLATE_KEY,
      email: resolveOwnerEmail(snapshot),
      signUrl: contract.owner_accept_token
        ? getAppUrl(`/contracts/${contract.owner_accept_token}`, 'contract owner reminder link')
        : null,
    });
  }

  if (!contract.guest_accepted_at) {
    targets.push({
      role: 'guest',
      templateKey: GUEST_TEMPLATE_KEY,
      originalTemplateKey: ORIGINAL_GUEST_TEMPLATE_KEY,
      email: resolveGuestEmail(snapshot),
      signUrl: contract.guest_accept_token
        ? getAppUrl(`/contracts/${contract.guest_accept_token}`, 'contract guest reminder link')
        : null,
    });
  }

  return targets;
}

export async function runUnsignedAgreementReminders(params?: {
  client?: AdminClient | null;
  now?: Date;
  dryRun?: boolean;
}) {
  const client = params?.client ?? getSupabaseAdminClient();
  const now = params?.now ?? new Date();
  const reminderHours = parseReminderHours();

  if (!client) {
    return {
      ok: false,
      now: now.toISOString(),
      reminderHours,
      candidates: 0,
      sent: 0,
      skipped: [],
      errors: [{ message: 'service_role_missing' }],
    } satisfies UnsignedAgreementReminderResult;
  }

  const { data: contracts, error: contractsError } = await client
    .from('contracts')
    .select(
      'id, owner_id, booking_request_id, status, sent_at, owner_accept_token, guest_accept_token, owner_accepted_at, guest_accepted_at, snapshot',
    )
    .eq('status', 'sent')
    .order('sent_at', { ascending: true, nullsFirst: false })
    .limit(MAX_CANDIDATES_PER_RUN);

  if (contractsError) {
    return {
      ok: false,
      now: now.toISOString(),
      reminderHours,
      candidates: 0,
      sent: 0,
      skipped: [],
      errors: [{ message: contractsError.message }],
    } satisfies UnsignedAgreementReminderResult;
  }

  const contractRows = (contracts ?? []) as ContractRow[];
  const contractIds = contractRows.map((contract) => contract.id);
  const skipped: Array<{ contractId: number; role?: 'owner' | 'guest'; reason: string }> = [];
  const errors: Array<{ contractId?: number; role?: 'owner' | 'guest'; message: string }> = [];

  if (contractIds.length === 0) {
    return {
      ok: true,
      now: now.toISOString(),
      reminderHours,
      candidates: 0,
      sent: 0,
      skipped,
      errors,
    } satisfies UnsignedAgreementReminderResult;
  }

  const { data: emailLogs, error: emailsError } = await client
    .from('outbound_emails')
    .select('id, template_key, status, related_entity_id, created_at, sent_at, metadata')
    .eq('related_entity_type', 'contract')
    .in('template_key', [
      ORIGINAL_OWNER_TEMPLATE_KEY,
      ORIGINAL_GUEST_TEMPLATE_KEY,
      OWNER_TEMPLATE_KEY,
      GUEST_TEMPLATE_KEY,
    ]);

  if (emailsError) {
    return {
      ok: false,
      now: now.toISOString(),
      reminderHours,
      candidates: contractRows.length,
      sent: 0,
      skipped,
      errors: [{ message: emailsError.message }],
    } satisfies UnsignedAgreementReminderResult;
  }

  let sent = 0;
  const allLogs = (emailLogs ?? []) as OutboundEmailRow[];

  for (const contract of contractRows) {
    const snapshot = contract.snapshot;
    for (const target of createPartyTargets(contract)) {
      try {
        const originalRows = buildEmailIndex(allLogs, target.originalTemplateKey, contract.id);
        if (originalRows.length === 0 || earliestSentOrCreated(originalRows) === null) {
          skipped.push({ contractId: contract.id, role: target.role, reason: 'original_email_missing' });
          continue;
        }

        const reminderRows = buildEmailIndex(allLogs, target.templateKey, contract.id);
        if (hasReminder(reminderRows)) {
          skipped.push({ contractId: contract.id, role: target.role, reason: 'already_reminded' });
          continue;
        }

        const originalSentAt = earliestSentOrCreated(originalRows);
        if (!originalSentAt) {
          skipped.push({ contractId: contract.id, role: target.role, reason: 'missing_sent_timestamp' });
          continue;
        }

        if (now.getTime() - originalSentAt < reminderHours * 60 * 60 * 1000) {
          skipped.push({ contractId: contract.id, role: target.role, reason: 'below_threshold' });
          continue;
        }

        if (!hasValidEmail(target.email)) {
          skipped.push({ contractId: contract.id, role: target.role, reason: 'recipient_email_missing' });
          continue;
        }

        if (!target.signUrl) {
          skipped.push({ contractId: contract.id, role: target.role, reason: 'signing_url_missing' });
          continue;
        }

        if (params?.dryRun) {
          sent += 1;
          continue;
        }

        if (target.role === 'owner') {
          await sendContractOwnerAgreementReminderEmail({
            to: target.email ?? '',
            ownerName: resolveOwnerName(snapshot),
            guestName: snapshot?.parties?.guest?.fullName ?? null,
            resortName: snapshot?.summary?.resortName ?? null,
            roomType: snapshot?.summary?.accommodationType ?? null,
            checkIn: snapshot?.summary?.checkIn ?? null,
            checkOut: snapshot?.summary?.checkOut ?? null,
            points: snapshot?.summary?.pointsRented ?? null,
            totalUsd: formatCurrency(snapshot?.summary?.totalPayableByGuestCents ?? null),
            agreementUrl: target.signUrl,
            templateKey: OWNER_TEMPLATE_KEY,
            recipientUserId: contract.owner_id,
            relatedEntityType: 'contract',
            relatedEntityId: null,
            metadata: {
              contractId: contract.id,
              bookingId: contract.booking_request_id,
              ownerId: contract.owner_id,
              recipientRole: 'owner',
            },
          });
        } else {
          await sendContractGuestAgreementReminderEmail({
            to: target.email ?? '',
            guestName: resolveGuestName(snapshot),
            resortName: snapshot?.summary?.resortName ?? null,
            roomType: snapshot?.summary?.accommodationType ?? null,
            checkIn: snapshot?.summary?.checkIn ?? null,
            checkOut: snapshot?.summary?.checkOut ?? null,
            points: snapshot?.summary?.pointsRented ?? null,
            totalUsd: formatCurrency(snapshot?.summary?.totalPayableByGuestCents ?? null),
            paidNowUsd: formatCurrency(snapshot?.summary?.paidNowCents ?? null),
            agreementUrl: target.signUrl,
            templateKey: GUEST_TEMPLATE_KEY,
            recipientUserId: null,
            relatedEntityType: 'contract',
            relatedEntityId: null,
            metadata: {
              contractId: contract.id,
              bookingId: contract.booking_request_id,
              ownerId: contract.owner_id,
              recipientRole: 'guest',
            },
          });
        }
        sent += 1;
      } catch (error) {
        errors.push({
          contractId: contract.id,
          role: target.role,
          message: error instanceof Error ? error.message : 'unknown_send_error',
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    now: now.toISOString(),
    reminderHours,
    candidates: contractRows.length,
    sent,
    skipped,
    errors,
  } satisfies UnsignedAgreementReminderResult;
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
}

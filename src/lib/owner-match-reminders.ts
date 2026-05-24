import { getAppUrl } from '@/lib/app-url';
import { sendOwnerMatchReminderEmail } from '@/lib/email';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

const TEMPLATE_KEY = 'owner_match_waiting_reminder';
const ORIGINAL_TEMPLATE_KEY = 'owner_match_waiting';
const DEFAULT_REMINDER_HOURS = 18;
const MAX_CANDIDATES_PER_RUN = 50;
const VALID_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

type PendingOwnerMatchRow = {
  id: string;
  booking_id: string;
  owner_id: string;
  status: string | null;
  created_at: string | null;
  responded_at: string | null;
  booking?: {
    id: string;
    status: string | null;
    availability_status: string | null;
    total_points: number | null;
    check_in: string | null;
    check_out: string | null;
    lead_guest_name: string | null;
    primary_resort?: { name: string | null } | null;
  } | null;
  owner?: {
    id: string;
    payout_email: string | null;
    display_name: string | null;
    profiles?:
      | {
          id: string | null;
          email: string | null;
          payout_email?: string | null;
          display_name: string | null;
        }
      | Array<{
          id: string | null;
          email: string | null;
          payout_email?: string | null;
          display_name: string | null;
        }>
      | null;
  } | null;
};

type OutboundEmailRow = {
  id: string;
  template_key: string;
  status: string | null;
  related_entity_id: string | null;
  created_at: string | null;
  sent_at: string | null;
};

export type OwnerMatchReminderResult = {
  ok: boolean;
  now: string;
  reminderHours: number;
  candidates: number;
  sent: number;
  skipped: Array<{ matchId: string; reason: string }>;
  errors: Array<{ matchId?: string; message: string }>;
};

function parseReminderHours() {
  const raw = process.env.OWNER_MATCH_REMINDER_HOURS;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_REMINDER_HOURS;
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_REMINDER_HOURS;
}

function parseIso(value: string | null | undefined) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function hasValidOwnerEmail(email: string | null | undefined) {
  return VALID_EMAIL_RE.test(email?.trim() ?? '');
}

function normalizeOwnerProfile(match: PendingOwnerMatchRow) {
  const profiles = match.owner?.profiles;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles ?? null;
}

function resolveOwnerEmail(match: PendingOwnerMatchRow) {
  const profile = normalizeOwnerProfile(match);
  return (
    profile?.payout_email?.trim() ||
    profile?.email?.trim() ||
    match.owner?.payout_email?.trim() ||
    null
  );
}

function isStillPending(match: PendingOwnerMatchRow) {
  if (match.status !== 'pending_owner') return false;
  if (match.responded_at) return false;
  if (match.booking?.status !== 'pending_owner') return false;
  if (match.booking?.availability_status && match.booking.availability_status !== 'confirmed') return false;
  return true;
}

function buildOriginalEmailMap(rows: OutboundEmailRow[]) {
  const map = new Map<string, OutboundEmailRow>();
  for (const row of rows) {
    if (!row.related_entity_id) continue;
    const existing = map.get(row.related_entity_id);
    if (!existing) {
      map.set(row.related_entity_id, row);
      continue;
    }
    const existingTime = parseIso(existing.sent_at ?? existing.created_at) ?? 0;
    const rowTime = parseIso(row.sent_at ?? row.created_at) ?? 0;
    if (rowTime < existingTime) {
      map.set(row.related_entity_id, row);
    }
  }
  return map;
}

function buildReminderSet(rows: OutboundEmailRow[]) {
  return new Set(rows.map((row) => row.related_entity_id).filter((value): value is string => Boolean(value)));
}

export async function runOwnerMatchReminders(params?: {
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
    } satisfies OwnerMatchReminderResult;
  }

  const { data: matches, error: matchesError } = await client
    .from('booking_matches')
    .select(
      'id, booking_id, owner_id, status, created_at, responded_at, booking:booking_requests!booking_matches_booking_id_fkey(id, status, availability_status, total_points, check_in, check_out, lead_guest_name, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)), owner:owners!booking_matches_owner_id_fkey(id, payout_email, display_name, profiles:profiles!owners_user_id_fkey(id, email, payout_email, display_name))',
    )
    .eq('status', 'pending_owner')
    .order('created_at', { ascending: true })
    .limit(MAX_CANDIDATES_PER_RUN);

  if (matchesError) {
    return {
      ok: false,
      now: now.toISOString(),
      reminderHours,
      candidates: 0,
      sent: 0,
      skipped: [],
      errors: [{ message: matchesError.message }],
    } satisfies OwnerMatchReminderResult;
  }

  const pendingMatches = ((matches ?? []) as PendingOwnerMatchRow[]).filter((match) => match.id && match.booking_id && match.owner_id);
  const matchIds = pendingMatches.map((match) => match.id);
  const skipped: Array<{ matchId: string; reason: string }> = [];
  const errors: Array<{ matchId?: string; message: string }> = [];

  if (matchIds.length === 0) {
    return {
      ok: true,
      now: now.toISOString(),
      reminderHours,
      candidates: 0,
      sent: 0,
      skipped,
      errors,
    } satisfies OwnerMatchReminderResult;
  }

  const { data: emailLogs, error: emailsError } = await client
    .from('outbound_emails')
    .select('id, template_key, status, related_entity_id, created_at, sent_at')
    .eq('related_entity_type', 'booking_match')
    .in('related_entity_id', matchIds)
    .in('template_key', [ORIGINAL_TEMPLATE_KEY, TEMPLATE_KEY]);

  if (emailsError) {
    return {
      ok: false,
      now: now.toISOString(),
      reminderHours,
      candidates: pendingMatches.length,
      sent: 0,
      skipped,
      errors: [{ message: emailsError.message }],
    } satisfies OwnerMatchReminderResult;
  }

  const originalEmailMap = buildOriginalEmailMap(
    ((emailLogs ?? []) as OutboundEmailRow[]).filter(
      (row) => row.template_key === ORIGINAL_TEMPLATE_KEY && row.status === 'sent',
    ),
  );
  const reminderSet = buildReminderSet(
    ((emailLogs ?? []) as OutboundEmailRow[]).filter((row) => row.template_key === TEMPLATE_KEY),
  );

  let sent = 0;

  for (const match of pendingMatches) {
    try {
      if (!isStillPending(match)) {
        skipped.push({ matchId: match.id, reason: 'match_no_longer_pending' });
        continue;
      }

      const ownerEmail = resolveOwnerEmail(match);
      if (!hasValidOwnerEmail(ownerEmail)) {
        skipped.push({ matchId: match.id, reason: 'owner_email_missing' });
        continue;
      }

      const originalEmail = originalEmailMap.get(match.id);
      if (!originalEmail) {
        skipped.push({ matchId: match.id, reason: 'original_email_missing' });
        continue;
      }

      if (reminderSet.has(match.id)) {
        skipped.push({ matchId: match.id, reason: 'already_reminded' });
        continue;
      }

      const sentAtMs = parseIso(originalEmail.sent_at ?? originalEmail.created_at) ?? parseIso(match.created_at);
      if (!sentAtMs) {
        skipped.push({ matchId: match.id, reason: 'missing_sent_timestamp' });
        continue;
      }

      if (now.getTime() - sentAtMs < reminderHours * 60 * 60 * 1000) {
        skipped.push({ matchId: match.id, reason: 'below_threshold' });
        continue;
      }

      if (params?.dryRun) {
        sent += 1;
        continue;
      }

      await sendOwnerMatchReminderEmail({
        to: ownerEmail ?? '',
        ownerName: normalizeOwnerProfile(match)?.display_name ?? match.owner?.display_name ?? undefined,
        guestName: match.booking?.lead_guest_name ?? undefined,
        resortName: match.booking?.primary_resort?.name ?? undefined,
        checkIn: match.booking?.check_in ?? undefined,
        checkOut: match.booking?.check_out ?? undefined,
        points: match.booking?.total_points ?? undefined,
        acceptUrl: getAppUrl(`/api/matches/owner/accept?matchId=${match.id}`, 'owner match reminder accept link'),
        declineUrl: getAppUrl(`/api/matches/owner/decline?matchId=${match.id}`, 'owner match reminder decline link'),
        templateKey: TEMPLATE_KEY,
        recipientUserId: normalizeOwnerProfile(match)?.id ?? null,
        relatedEntityType: 'booking_match',
        relatedEntityId: match.id,
        metadata: {
          bookingId: match.booking_id,
          matchId: match.id,
          ownerId: match.owner_id,
          reminderHours,
        },
      });
      sent += 1;
    } catch (sendError) {
      errors.push({
        matchId: match.id,
        message: sendError instanceof Error ? sendError.message : 'unknown_send_error',
      });
    }
  }

  return {
    ok: errors.length === 0,
    now: now.toISOString(),
    reminderHours,
    candidates: pendingMatches.length,
    sent,
    skipped,
    errors,
  } satisfies OwnerMatchReminderResult;
}

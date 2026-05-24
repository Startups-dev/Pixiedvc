import { getAppUrl } from '@/lib/app-url';
import { sendAbandonedGuestBookingRequestEmail } from '@/lib/email';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

const TEMPLATE_KEY = 'abandoned_guest_booking_request';
const DEFAULT_DELAY_MINUTES = 45;
const MAX_CANDIDATES_PER_RUN = 50;
const VALID_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

type DraftBookingRow = {
  id: string;
  renter_id: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string | null;
  lead_guest_name: string | null;
  lead_guest_email: string | null;
  lead_guest_phone: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  comments: string | null;
  check_in: string | null;
  check_out: string | null;
  primary_resort_id: string | null;
  primary_resort?: { name: string | null } | null;
  adults: number | null;
  youths: number | null;
};

export type AbandonedBookingRecoveryResult = {
  ok: boolean;
  now: string;
  inactivityMinutes: number;
  candidates: number;
  sent: number;
  skipped: Array<{ bookingId: string; reason: string }>;
  errors: Array<{ bookingId?: string; message: string }>;
};

function parseDelayMinutes() {
  const raw = process.env.ABANDONED_BOOKING_DELAY_MINUTES;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_DELAY_MINUTES;
  return Number.isFinite(parsed) && parsed >= 30 ? parsed : DEFAULT_DELAY_MINUTES;
}

export function isRecoverableDraft(row: DraftBookingRow) {
  if (row.status !== 'draft') return false;
  const email = row.lead_guest_email?.trim() ?? '';
  if (!VALID_EMAIL_RE.test(email)) return false;

  return Boolean(
    row.check_in ||
      row.check_out ||
      row.primary_resort_id ||
      row.lead_guest_name ||
      row.lead_guest_phone ||
      row.address_line1 ||
      row.city ||
      row.state ||
      row.postal_code ||
      row.country ||
      row.comments ||
      (typeof row.adults === 'number' && row.adults > 0) ||
      (typeof row.youths === 'number' && row.youths > 0),
  );
}

async function hasExistingReminder(client: AdminClient, bookingId: string) {
  const { data, error } = await client
    .from('outbound_emails')
    .select('id, status')
    .eq('template_key', TEMPLATE_KEY)
    .eq('related_entity_type', 'booking_request')
    .eq('related_entity_id', bookingId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

export async function runAbandonedBookingRequestRecovery(params?: {
  client?: AdminClient | null;
  now?: Date;
  dryRun?: boolean;
}) {
  const client = params?.client ?? getSupabaseAdminClient();
  if (!client) {
    return {
      ok: false,
      now: (params?.now ?? new Date()).toISOString(),
      inactivityMinutes: parseDelayMinutes(),
      candidates: 0,
      sent: 0,
      skipped: [],
      errors: [{ message: 'service_role_missing' }],
    } satisfies AbandonedBookingRecoveryResult;
  }

  const now = params?.now ?? new Date();
  const inactivityMinutes = parseDelayMinutes();
  const cutoffIso = new Date(now.getTime() - inactivityMinutes * 60_000).toISOString();

  const { data: drafts, error } = await client
    .from('booking_requests')
    .select(
      'id, renter_id, status, created_at, updated_at, lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, city, state, postal_code, country, comments, check_in, check_out, primary_resort_id, adults, youths, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)',
    )
    .eq('status', 'draft')
    .lte('updated_at', cutoffIso)
    .order('updated_at', { ascending: true })
    .limit(MAX_CANDIDATES_PER_RUN);

  if (error) {
    return {
      ok: false,
      now: now.toISOString(),
      inactivityMinutes,
      candidates: 0,
      sent: 0,
      skipped: [],
      errors: [{ message: error.message }],
    } satisfies AbandonedBookingRecoveryResult;
  }

  const candidates = ((drafts ?? []) as DraftBookingRow[]).filter(isRecoverableDraft);
  const skipped: Array<{ bookingId: string; reason: string }> = [];
  const errors: Array<{ bookingId?: string; message: string }> = [];
  let sent = 0;

  for (const draft of candidates) {
    try {
      const existingReminder = await hasExistingReminder(client, draft.id);
      if (existingReminder) {
        skipped.push({ bookingId: draft.id, reason: 'already_reminded' });
        continue;
      }

      if (params?.dryRun) {
        sent += 1;
        continue;
      }

      await sendAbandonedGuestBookingRequestEmail({
        to: draft.lead_guest_email ?? '',
        guestName: draft.lead_guest_name,
        resortName: draft.primary_resort?.name ?? null,
        checkIn: draft.check_in,
        checkOut: draft.check_out,
        resumeUrl: getAppUrl('/stay-builder', 'abandoned booking request recovery link'),
        templateKey: TEMPLATE_KEY,
        recipientUserId: draft.renter_id,
        relatedEntityType: 'booking_request',
        relatedEntityId: draft.id,
        metadata: {
          bookingId: draft.id,
          abandonedDelayMinutes: inactivityMinutes,
        },
      });
      sent += 1;
    } catch (sendError) {
      errors.push({
        bookingId: draft.id,
        message: sendError instanceof Error ? sendError.message : 'unknown_send_error',
      });
    }
  }

  return {
    ok: errors.length === 0,
    now: now.toISOString(),
    inactivityMinutes,
    candidates: candidates.length,
    sent,
    skipped,
    errors,
  } satisfies AbandonedBookingRecoveryResult;
}

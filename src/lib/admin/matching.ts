import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { runMatchBookings, type MatchRunResult } from '@/lib/match-bookings';
import { computePaymentSchedule, type PaymentScheduleResult } from '@/lib/payments/schedule';
import { computeTaxes, type TaxRateRow } from '@/lib/tax/computeTaxes';

export type AdminMatchListFilters = {
  scope?: 'matches' | 'unmatched_guests' | 'unmatched_owners' | null;
  q?: string | null;
  matchStatus?: string | null;
  bookingStatus?: string | null;
  checkInFrom?: string | null;
  checkInTo?: string | null;
  checkOutFrom?: string | null;
  checkOutTo?: string | null;
  matchCreatedFrom?: string | null;
  matchCreatedTo?: string | null;
  matchExpiresFrom?: string | null;
  matchExpiresTo?: string | null;
  hasRental?: boolean | null;
  payoutStatus?: 'pending' | 'released' | null;
  sort?: string | null;
  limit?: number | null;
  offset?: number | null;
};

export type AdminMatchListResult = {
  rows: Array<{
    row_id: string;
    kind: 'match' | 'unmatched_guest' | 'unmatched_owner';
    match: Record<string, unknown> | null;
    booking: Record<string, unknown> | null;
    owner: Record<string, unknown> | null;
    rental: Record<string, unknown> | null;
    flags: {
      bookingCancelled: boolean;
      invalidMatch: boolean;
      payoutStatus: 'none' | 'pending' | 'released';
      hasRental: boolean;
      isExpiringSoon: boolean;
    };
  }>;
  totalCount: number;
  limit: number;
  offset: number;
};

const MAX_LIMIT = 100;

function clampLimit(value: number | null | undefined) {
  const numeric = Number(value ?? 20);
  if (!Number.isFinite(numeric)) return 20;
  return Math.min(Math.max(Math.floor(numeric), 1), MAX_LIMIT);
}

function clampOffset(value: number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(Math.floor(numeric), 0);
}

function normalizeProfile(
  profiles:
    | { display_name: string | null; email: string | null }
    | Array<{ display_name: string | null; email: string | null }>
    | null,
) {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

type RunAdminMatcherOptions = {
  client?: SupabaseClient;
  origin?: string;
  dryRun?: boolean;
  bookingId?: string | null;
  limit?: number;
  now?: Date;
  sendEmails?: boolean;
};

function resolveOrigin(origin?: string) {
  if (origin) return origin;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL ?? '';
  if (!base) throw new Error('Site URL not set');
  return base.startsWith('http') ? base : `https://${base}`;
}

export async function runAdminMatcher(options: RunAdminMatcherOptions) {
  const client = options.client ?? getSupabaseAdminClient();
  if (!client) throw new Error('Supabase admin client not available');
  const origin = resolveOrigin(options.origin);

  return runMatchBookings({
    client,
    origin,
    dryRun: options.dryRun,
    bookingId: options.bookingId ?? null,
    limit: options.limit,
    now: options.now,
    sendEmails: options.sendEmails,
  }) as Promise<MatchRunResult>;
}

function getBookingTotalCents(booking: {
  guest_total_cents?: number | null;
  est_cash?: number | null;
} | null) {
  if (!booking) return null;
  if (typeof booking.guest_total_cents === 'number' && booking.guest_total_cents > 0) {
    return Math.round(booking.guest_total_cents);
  }
  if (typeof booking.est_cash === 'number' && booking.est_cash > 0) {
    return Math.round(booking.est_cash * 100);
  }
  return null;
}

function isMissingRelationError(error: { code?: string } | null, codes: string[]) {
  if (!error?.code) return false;
  return codes.includes(error.code);
}

async function getRentalIdsForPayoutStatus(
  client: SupabaseClient,
  status: 'pending' | 'released',
) {
  if (status === 'released') {
    const { data, error } = await client
      .from('payout_ledger')
      .select('rental_id')
      .eq('status', 'released');
    if (error) {
      throw error;
    }
    return new Set((data ?? []).map((row) => row.rental_id as string));
  }

  const { data: releasedRows, error: releasedError } = await client
    .from('payout_ledger')
    .select('rental_id')
    .eq('status', 'released');

  if (releasedError) {
    throw releasedError;
  }

  const releasedIds = new Set((releasedRows ?? []).map((row) => row.rental_id as string));
  const { data: pendingRows, error: pendingError } = await client
    .from('payout_ledger')
    .select('rental_id')
    .eq('status', 'pending');

  if (pendingError) {
    throw pendingError;
  }

  const filtered = new Set<string>();
  for (const row of pendingRows ?? []) {
    const rentalId = row.rental_id as string;
    if (!releasedIds.has(rentalId)) {
      filtered.add(rentalId);
    }
  }

  return filtered;
}

async function getPayoutStatusMap(client: SupabaseClient, rentalIds: string[]) {
  if (rentalIds.length === 0) return new Map<string, 'pending' | 'released'>();

  const { data, error } = await client
    .from('payout_ledger')
    .select('rental_id, status')
    .in('rental_id', rentalIds);

  if (error) {
    throw error;
  }

  const map = new Map<string, 'pending' | 'released'>();
  for (const row of data ?? []) {
    const rentalId = row.rental_id as string;
    const status = row.status as 'pending' | 'released';
    if (status === 'released') {
      map.set(rentalId, 'released');
      continue;
    }
    if (!map.has(rentalId)) {
      map.set(rentalId, 'pending');
    }
  }

  return map;
}

export async function fetchAdminMatchList(options: {
  authClient: SupabaseClient;
  filters?: AdminMatchListFilters;
  now?: Date;
}): Promise<AdminMatchListResult> {
  const { authClient, filters = {}, now = new Date() } = options;
  const client = getSupabaseAdminClient() ?? authClient;

  const limit = clampLimit(filters.limit);
  const offset = clampOffset(filters.offset);
  const scope = filters.scope ?? 'matches';

  if (scope === 'unmatched_guests') {
    return fetchUnmatchedGuests({ client, filters, limit, offset });
  }

  if (scope === 'unmatched_owners') {
    return fetchUnmatchedOwners({ client, filters, limit, offset });
  }

  let query = client
    .from('booking_matches')
    .select(
      `
      id,
      booking_id,
      status,
      points_reserved,
      created_at,
      expires_at,
      booking:booking_requests (
        id,
        status,
        check_in,
        check_out,
        total_points,
        primary_resort_id,
        lead_guest_email,
        lead_guest_name
      ),
      owner:owners (
        id,
        profiles:profiles!owners_user_id_fkey (
          display_name,
          email
        )
      ),
      rental:rentals!rentals_match_id_fkey (
        id,
        status,
        dvc_confirmation_number,
        check_in
      )
    `,
      { count: 'exact' },
    )
    .range(offset, offset + limit - 1);

  if (filters.matchStatus) {
    query = query.eq('status', filters.matchStatus);
  }

  if (filters.bookingStatus) {
    query = query.eq('booking.status', filters.bookingStatus);
  }

  if (filters.checkInFrom) {
    query = query.gte('booking.check_in', filters.checkInFrom);
  }

  if (filters.checkInTo) {
    query = query.lte('booking.check_in', filters.checkInTo);
  }

  if (filters.checkOutFrom) {
    query = query.gte('booking.check_out', filters.checkOutFrom);
  }

  if (filters.checkOutTo) {
    query = query.lte('booking.check_out', filters.checkOutTo);
  }

  if (filters.matchCreatedFrom) {
    query = query.gte('created_at', filters.matchCreatedFrom);
  }

  if (filters.matchCreatedTo) {
    query = query.lte('created_at', filters.matchCreatedTo);
  }

  if (filters.matchExpiresFrom) {
    query = query.gte('expires_at', filters.matchExpiresFrom);
  }

  if (filters.matchExpiresTo) {
    query = query.lte('expires_at', filters.matchExpiresTo);
  }

  if (typeof filters.hasRental === 'boolean') {
    query = filters.hasRental
      ? query.not('rental.id', 'is', null)
      : query.is('rental.id', null);
  }

  const search = filters.q?.trim();
  if (search) {
    query = query.or(
      [
        `id.ilike.${search}%`,
        `booking.id.ilike.${search}%`,
        `rental.id.ilike.${search}%`,
        `owner.profiles.email.ilike.%${search}%`,
        `booking.lead_guest_email.ilike.%${search}%`,
        `booking.lead_guest_name.ilike.%${search}%`,
      ].join(','),
    );
  }

  if (filters.payoutStatus) {
    const rentalIds = await getRentalIdsForPayoutStatus(client, filters.payoutStatus);
    if (rentalIds.size === 0) {
      return { rows: [], totalCount: 0, limit, offset };
    }
    query = query.in('rental.id', Array.from(rentalIds));
  }

  const sort = filters.sort ?? 'match_created_desc';
  switch (sort) {
    case 'match_created_asc':
      query = query.order('created_at', { ascending: true }).order('id', { ascending: true });
      break;
    case 'check_in_asc':
      query = query
        .order('check_in', { ascending: true, foreignTable: 'booking' })
        .order('id', { ascending: true });
      break;
    case 'check_in_desc':
      query = query
        .order('check_in', { ascending: false, foreignTable: 'booking' })
        .order('id', { ascending: false });
      break;
    case 'expires_asc':
      query = query.order('expires_at', { ascending: true }).order('id', { ascending: true });
      break;
    case 'expires_desc':
      query = query.order('expires_at', { ascending: false }).order('id', { ascending: false });
      break;
    case 'match_created_desc':
    default:
      query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
  }

  const { data, error, count } = await query;
  if (error) {
    throw error;
  }

  const rentalIds = (data ?? [])
    .map((row) => row.rental?.id as string | undefined)
    .filter((value): value is string => Boolean(value));
  const payoutMap = await getPayoutStatusMap(client, rentalIds);

  const rows = (data ?? []).map((row) => {
    const booking = row.booking ?? null;
    const rental = row.rental ?? null;
    const owner = row.owner ?? null;
    const profile = normalizeProfile(owner?.profiles ?? null);
    const expiresAt = row.expires_at ?? null;
    const expiresTime = expiresAt ? new Date(expiresAt).getTime() : null;
    const isExpiringSoon =
      expiresTime !== null &&
      expiresTime > now.getTime() &&
      expiresTime <= now.getTime() + 6 * 60 * 60 * 1000;

    const bookingCancelled = booking?.status === 'cancelled';
    const matchPending = ['pending_owner', 'pending', 'offered'].includes(row.status ?? '');
    const payoutStatus = rental?.id ? payoutMap.get(rental.id) ?? 'none' : 'none';

    return {
      row_id: `match_${row.id}`,
      kind: 'match',
      match: {
        id: row.id,
        booking_id: row.booking_id ?? null,
        status: row.status ?? null,
        points_reserved: row.points_reserved ?? null,
        created_at: row.created_at ?? null,
        expires_at: row.expires_at ?? null,
      },
      booking: booking
        ? {
            id: booking.id ?? null,
            status: booking.status ?? null,
            check_in: booking.check_in ?? null,
            check_out: booking.check_out ?? null,
            total_points: booking.total_points ?? null,
            primary_resort_id: booking.primary_resort_id ?? null,
            lead_guest_email: booking.lead_guest_email ?? null,
            lead_guest_name: booking.lead_guest_name ?? null,
          }
        : null,
      owner: owner
        ? {
            id: owner.id ?? null,
            display_name: profile?.display_name ?? null,
            email: profile?.email ?? null,
          }
        : null,
      rental: rental
        ? {
            id: rental.id ?? null,
            status: rental.status ?? null,
            dvc_confirmation_number: rental.dvc_confirmation_number ?? null,
            check_in: rental.check_in ?? null,
          }
        : null,
      flags: {
        bookingCancelled,
        invalidMatch: bookingCancelled && matchPending,
        payoutStatus,
        hasRental: Boolean(rental?.id),
        isExpiringSoon,
      },
    };
  });

  return {
    rows,
    totalCount: count ?? 0,
    limit,
    offset,
  };
}

async function fetchUnmatchedGuests(options: {
  client: SupabaseClient;
  filters: AdminMatchListFilters;
  limit: number;
  offset: number;
}): Promise<AdminMatchListResult> {
  const { client, filters, limit, offset } = options;

  if (
    filters.matchStatus ||
    filters.matchCreatedFrom ||
    filters.matchCreatedTo ||
    filters.matchExpiresFrom ||
    filters.matchExpiresTo ||
    filters.payoutStatus ||
    filters.hasRental
  ) {
    return { rows: [], totalCount: 0, limit, offset };
  }

  const activeStatuses = ['submitted', 'pending_match'];

  const { data: matchRows, error: matchError } = await client
    .from('booking_matches')
    .select('booking_id');

  if (matchError) {
    throw matchError;
  }

  const matchedBookingIds = new Set(
    (matchRows ?? [])
      .map((row) => row.booking_id as string | null)
      .filter((value): value is string => Boolean(value)),
  );

  let bookingQuery = client
    .from('booking_requests')
    .select(
      'id, status, check_in, check_out, total_points, primary_resort_id, lead_guest_email, lead_guest_name, created_at',
    );

  if (filters.bookingStatus) {
    bookingQuery = bookingQuery.eq('status', filters.bookingStatus);
  } else {
    bookingQuery = bookingQuery.in('status', activeStatuses);
  }

  if (filters.checkInFrom) {
    bookingQuery = bookingQuery.gte('check_in', filters.checkInFrom);
  }
  if (filters.checkInTo) {
    bookingQuery = bookingQuery.lte('check_in', filters.checkInTo);
  }
  if (filters.checkOutFrom) {
    bookingQuery = bookingQuery.gte('check_out', filters.checkOutFrom);
  }
  if (filters.checkOutTo) {
    bookingQuery = bookingQuery.lte('check_out', filters.checkOutTo);
  }

  const { data: bookings, error: bookingError } = await bookingQuery;
  if (bookingError) {
    throw bookingError;
  }

  const search = filters.q?.trim().toLowerCase();
  const filtered = (bookings ?? []).filter((booking) => {
    if (matchedBookingIds.has(booking.id)) return false;
    if (!search) return true;
    const haystack = [
      booking.id,
      booking.lead_guest_email,
      booking.lead_guest_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  });

  const sorted = filtered.sort((a, b) => {
    const aDate = a.check_in ?? a.created_at ?? '';
    const bDate = b.check_in ?? b.created_at ?? '';
    if (filters.sort === 'check_in_asc') {
      return aDate.localeCompare(bDate);
    }
    if (filters.sort === 'check_in_desc') {
      return bDate.localeCompare(aDate);
    }
    return bDate.localeCompare(aDate);
  });

  const paged = sorted.slice(offset, offset + limit);

  const rows = paged.map((booking) => ({
    row_id: `booking_${booking.id}`,
    kind: 'unmatched_guest' as const,
    match: null,
    booking: {
      id: booking.id ?? null,
      status: booking.status ?? null,
      check_in: booking.check_in ?? null,
      check_out: booking.check_out ?? null,
      total_points: booking.total_points ?? null,
      primary_resort_id: booking.primary_resort_id ?? null,
      lead_guest_email: booking.lead_guest_email ?? null,
      lead_guest_name: booking.lead_guest_name ?? null,
    },
    owner: null,
    rental: null,
    flags: {
      bookingCancelled: booking.status === 'cancelled',
      invalidMatch: false,
      payoutStatus: 'none' as const,
      hasRental: false,
      isExpiringSoon: false,
    },
  }));

  return {
    rows,
    totalCount: filtered.length,
    limit,
    offset,
  };
}

async function fetchUnmatchedOwners(options: {
  client: SupabaseClient;
  filters: AdminMatchListFilters;
  limit: number;
  offset: number;
}): Promise<AdminMatchListResult> {
  const { client, filters, limit, offset } = options;

  if (
    filters.matchStatus ||
    filters.bookingStatus ||
    filters.checkInFrom ||
    filters.checkInTo ||
    filters.checkOutFrom ||
    filters.checkOutTo ||
    filters.matchCreatedFrom ||
    filters.matchCreatedTo ||
    filters.matchExpiresFrom ||
    filters.matchExpiresTo ||
    filters.payoutStatus ||
    filters.hasRental
  ) {
    return { rows: [], totalCount: 0, limit, offset };
  }

  const activeInventoryStatuses = ['submitted', 'reviewed', 'approved', 'offered'];
  const activeMatchStatuses = ['pending_owner', 'pending', 'offered', 'accepted'];

  const { data: inventoryRows, error: inventoryError } = await client
    .from('private_inventory')
    .select('owner_id')
    .in('status', activeInventoryStatuses);

  if (inventoryError) {
    throw inventoryError;
  }

  const inventoryOwnerIds = Array.from(
    new Set(
      (inventoryRows ?? [])
        .map((row) => row.owner_id as string | null)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (inventoryOwnerIds.length === 0) {
    return { rows: [], totalCount: 0, limit, offset };
  }

  const { data: activeMatchRows, error: activeMatchError } = await client
    .from('booking_matches')
    .select('owner_id')
    .in('status', activeMatchStatuses)
    .in('owner_id', inventoryOwnerIds);

  if (activeMatchError) {
    throw activeMatchError;
  }

  const activeOwnerIds = new Set(
    (activeMatchRows ?? [])
      .map((row) => row.owner_id as string | null)
      .filter((value): value is string => Boolean(value)),
  );

  const unmatchedOwnerIds = inventoryOwnerIds.filter((id) => !activeOwnerIds.has(id));

  if (unmatchedOwnerIds.length === 0) {
    return { rows: [], totalCount: 0, limit, offset };
  }

  const { data: owners, error: ownersError } = await client
    .from('owners')
    .select(
      'id, profiles:profiles!owners_user_id_fkey ( display_name, email )',
    )
    .in('id', unmatchedOwnerIds);

  if (ownersError) {
    throw ownersError;
  }

  const search = filters.q?.trim().toLowerCase();
  const filteredOwners = (owners ?? []).filter((owner) => {
    if (!search) return true;
    const profile = normalizeProfile(owner.profiles ?? null);
    const haystack = [owner.id, profile?.display_name, profile?.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  });

  const sorted = filteredOwners.sort((a, b) => {
    const aProfile = normalizeProfile(a.profiles ?? null);
    const bProfile = normalizeProfile(b.profiles ?? null);
    const aName = (aProfile?.display_name ?? a.id ?? '').toString();
    const bName = (bProfile?.display_name ?? b.id ?? '').toString();
    return aName.localeCompare(bName);
  });

  const paged = sorted.slice(offset, offset + limit);

  const rows = paged.map((owner) => {
    const profile = normalizeProfile(owner.profiles ?? null);
    return {
      row_id: `owner_${owner.id}`,
      kind: 'unmatched_owner' as const,
      match: null,
      booking: null,
      owner: {
        id: owner.id ?? null,
        display_name: profile?.display_name ?? null,
        email: profile?.email ?? null,
      },
      rental: null,
      flags: {
        bookingCancelled: false,
        invalidMatch: false,
        payoutStatus: 'none' as const,
        hasRental: false,
        isExpiringSoon: false,
      },
    };
  });

  return {
    rows,
    totalCount: filteredOwners.length,
    limit,
    offset,
  };
}

export type AdminMatchDetailResult = {
  match: {
    id: string;
    status: string | null;
    created_at: string | null;
    expires_at: string | null;
    responded_at: string | null;
    points_reserved: number | null;
    owner_membership_id: string | number | null;
    booking_id: string | null;
    owner_id: string | null;
  } | null;
  booking: {
    id: string;
    status: string | null;
    check_in: string | null;
    check_out: string | null;
    created_at: string | null;
    guest_total_cents: number | null;
    est_cash: number | null;
    deposit_due: number | null;
    total_points: number | null;
    primary_resort_id: string | null;
    lead_guest_email: string | null;
    lead_guest_name: string | null;
    phone: string | null;
  } | null;
  owner: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
  rental: {
    id: string;
    status: string | null;
    check_in: string | null;
    check_out: string | null;
    dvc_confirmation_number: string | null;
  } | null;
  milestones: Array<{
    code: string | null;
    status: string | null;
    occurred_at: string | null;
  }>;
  payouts: Array<{
    stage: number | null;
    amount_cents: number | null;
    status: string | null;
    eligible_at: string | null;
    released_at: string | null;
  }>;
  transactions: Array<{
    id: string;
    txn_type: string | null;
    direction: string | null;
    amount_cents: number | null;
    status: string | null;
    processor: string | null;
    processor_ref: string | null;
    meta: Record<string, unknown> | null;
    paid_at: string | null;
    created_at: string | null;
    splits: Array<{
      recipient_type: string | null;
      owner_id: number | null;
      jurisdiction_id: string | null;
      amount_cents: number | null;
    }>;
  }>;
  paymentSchedule: PaymentScheduleResult;
  taxBreakdown: {
    jurisdictionName: string | null;
    lines: Array<{
      tax_type: string;
      rate_bps: number;
      tax_cents: number;
    }>;
    warnings: string[];
  };
  expectedSplits: {
    platform_fee_cents: number | null;
    owner_receivable_cents: number | null;
    tax_liability_cents: number;
    warnings: string[];
  };
  flags: {
    bookingCancelled: boolean;
    invalidMatch: boolean;
    hasRental: boolean;
    payoutStatus: 'none' | 'pending' | 'released';
    isExpiringSoon: boolean;
  };
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function fetchAdminMatchDetail(options: {
  authClient: SupabaseClient;
  matchId: string;
  now?: Date;
}): Promise<AdminMatchDetailResult> {
  const { authClient, matchId, now = new Date() } = options;
  const client = getSupabaseAdminClient() ?? authClient;
  const emptySchedule = computePaymentSchedule({
    booking: null,
    transactions: [],
    total_tax_cents: 0,
  });
  const emptyTaxBreakdown = { jurisdictionName: null, lines: [], warnings: [] as string[] };
  const emptyExpectedSplits = {
    platform_fee_cents: null,
    owner_receivable_cents: null,
    tax_liability_cents: 0,
    warnings: [] as string[],
  };

  if (!isUuid(matchId)) {
    return {
      match: null,
      booking: null,
      owner: null,
      rental: null,
      milestones: [],
      payouts: [],
      transactions: [],
      paymentSchedule: emptySchedule,
      taxBreakdown: emptyTaxBreakdown,
      expectedSplits: emptyExpectedSplits,
      flags: {
        bookingCancelled: false,
        invalidMatch: false,
        hasRental: false,
        payoutStatus: 'none',
        isExpiringSoon: false,
      },
    };
  }

  const { data: match, error: matchError } = await client
    .from('booking_matches')
    .select(
      'id, status, created_at, expires_at, responded_at, points_reserved, owner_membership_id, booking_id, owner_id',
    )
    .eq('id', matchId)
    .maybeSingle();

  if (matchError) {
    throw matchError;
  }

  if (!match) {
    return {
      match: null,
      booking: null,
      owner: null,
      rental: null,
      milestones: [],
      payouts: [],
      transactions: [],
      paymentSchedule: emptySchedule,
      taxBreakdown: emptyTaxBreakdown,
      expectedSplits: emptyExpectedSplits,
      flags: {
        bookingCancelled: false,
        invalidMatch: false,
        hasRental: false,
        payoutStatus: 'none',
        isExpiringSoon: false,
      },
    };
  }

  const { data: booking, error: bookingError } = await client
    .from('booking_requests')
    .select(
      'id, status, check_in, check_out, created_at, guest_total_cents, est_cash, deposit_due, total_points, primary_resort_id, lead_guest_email, lead_guest_name, phone',
    )
    .eq('id', match.booking_id)
    .maybeSingle();

  if (bookingError) {
    throw bookingError;
  }

  const { data: owner, error: ownerError } = await client
    .from('owners')
    .select(
      'id, profiles:profiles!owners_user_id_fkey(display_name, email)',
    )
    .eq('id', match.owner_id)
    .maybeSingle();

  if (ownerError) {
    throw ownerError;
  }

  const { data: rental, error: rentalError } = await client
    .from('rentals')
    .select('id, status, check_in, check_out, dvc_confirmation_number')
    .eq('match_id', matchId)
    .maybeSingle();

  if (rentalError) {
    throw rentalError;
  }

  let milestones: AdminMatchDetailResult['milestones'] = [];
  let payouts: AdminMatchDetailResult['payouts'] = [];
  let payoutStatus: 'none' | 'pending' | 'released' = 'none';
  let paymentSchedule = computePaymentSchedule({
    booking: booking ?? null,
    transactions: [],
    total_tax_cents: 0,
  });

  if (rental?.id) {
    const { data: milestoneRows, error: milestoneError } = await client
      .from('rental_milestones')
      .select('code, status, occurred_at')
      .eq('rental_id', rental.id)
      .order('created_at', { ascending: true });

    if (milestoneError) {
      throw milestoneError;
    }

    const { data: payoutRows, error: payoutError } = await client
      .from('payout_ledger')
      .select('stage, amount_cents, status, eligible_at, released_at')
      .eq('rental_id', rental.id)
      .order('stage', { ascending: true });

    if (payoutError) {
      throw payoutError;
    }

    milestones = (milestoneRows ?? []) as AdminMatchDetailResult['milestones'];
    payouts = (payoutRows ?? []) as AdminMatchDetailResult['payouts'];

    payoutStatus = payouts.some((row) => row.status === 'released')
      ? 'released'
      : payouts.some((row) => row.status === 'pending')
        ? 'pending'
        : 'none';
  }

  let resortRow: { id: string; tax_jurisdiction_id: string | null } | null = null;
  const { data: resortData, error: resortError } = await client
    .from('resorts')
    .select('id, tax_jurisdiction_id')
    .eq('id', booking?.primary_resort_id ?? '')
    .maybeSingle();

  if (resortError) {
    if (!isMissingRelationError(resortError, ['42P01', '42703'])) {
      throw resortError;
    }
  } else {
    resortRow = resortData as typeof resortRow;
  }

  const referenceDate =
    booking?.created_at ? new Date(booking.created_at).toISOString().slice(0, 10) : null;
  let taxRates: TaxRateRow[] = [];
  if (resortRow?.tax_jurisdiction_id) {
    let rateQuery = client
      .from('tax_rates')
      .select('jurisdiction_id, tax_type, rate_bps, applies_to, effective_from, effective_to')
      .eq('jurisdiction_id', resortRow.tax_jurisdiction_id);

    if (referenceDate) {
      rateQuery = rateQuery
        .lte('effective_from', referenceDate)
        .or(`effective_to.is.null,effective_to.gte.${referenceDate}`);
    }

    const { data: rateRows, error: rateError } = await rateQuery;
    if (rateError) {
      if (!isMissingRelationError(rateError, ['42P01'])) {
        throw rateError;
      }
    } else {
      taxRates = (rateRows ?? []).map((row) => ({
        jurisdiction_id: row.jurisdiction_id as string,
        tax_type: row.tax_type as string,
        rate_bps: row.rate_bps as number,
        applies_to: row.applies_to as 'lodging' | 'service_fee' | 'both',
      }));
    }
  }

  const lodgingTotalCents = getBookingTotalCents(booking ?? null);
  const taxComputation = computeTaxes({
    total_cents: lodgingTotalCents,
    jurisdiction_id: resortRow?.tax_jurisdiction_id ?? null,
    rates: taxRates,
  });

  let transactionRows:
    | Array<{
        id: string;
        txn_type: string | null;
        direction: string | null;
        amount_cents: number | null;
        status: string | null;
        processor: string | null;
        processor_ref: string | null;
        meta: Record<string, unknown> | null;
        paid_at: string | null;
        created_at: string | null;
      }>
    | null = null;
  let transactionError: { code?: string } | null = null;

  const transactionQuery = client
    .from('transactions')
    .select(
      'id, txn_type, direction, amount_cents, status, processor, processor_ref, meta, paid_at, created_at',
    )
    .eq('match_id', matchId)
    .order('created_at', { ascending: false });

  const transactionResult = await transactionQuery;
  transactionRows = transactionResult.data as typeof transactionRows;
  transactionError = transactionResult.error as typeof transactionError;

  if (transactionError) {
    if (isMissingRelationError(transactionError, ['42703'])) {
      const fallbackResult = await client
        .from('transactions')
        .select(
          'id, txn_type, direction, amount_cents, status, processor, processor_ref, paid_at, created_at',
        )
        .eq('match_id', matchId)
        .order('created_at', { ascending: false });
      if (fallbackResult.error) {
        if (!isMissingRelationError(fallbackResult.error, ['42P01'])) {
          throw fallbackResult.error;
        }
        transactionRows = [];
      } else {
        transactionRows = (fallbackResult.data ?? []).map((row) => ({
          ...row,
          meta: null,
        })) as typeof transactionRows;
      }
    } else if (isMissingRelationError(transactionError, ['42P01'])) {
      transactionRows = [];
    } else {
      throw transactionError;
    }
  }

  const transactionList = (transactionRows ?? []) as Array<{
    id: string;
    txn_type: string | null;
    direction: string | null;
    amount_cents: number | null;
    status: string | null;
    processor: string | null;
    processor_ref: string | null;
    meta: Record<string, unknown> | null;
    paid_at: string | null;
    created_at: string | null;
  }>;

  const splitMap = new Map<string, AdminMatchDetailResult['transactions'][number]['splits']>();
  if (transactionList.length > 0) {
    const { data: splitRows, error: splitError } = await client
      .from('transaction_splits')
      .select('transaction_id, recipient_type, owner_id, jurisdiction_id, amount_cents')
      .in(
        'transaction_id',
        transactionList.map((row) => row.id),
      );

    if (splitError) {
      if (!isMissingRelationError(splitError, ['42P01'])) {
        throw splitError;
      }
    }

    for (const split of splitRows ?? []) {
      const id = split.transaction_id as string;
      const list = splitMap.get(id) ?? [];
      list.push({
        recipient_type: split.recipient_type as string | null,
        owner_id: split.owner_id as number | null,
        jurisdiction_id: split.jurisdiction_id as string | null,
        amount_cents: split.amount_cents as number | null,
      });
      splitMap.set(id, list);
    }
  }

  let jurisdictionName: string | null = null;
  if (resortRow?.tax_jurisdiction_id) {
    const { data: jurisdictionRow, error: jurisdictionError } = await client
      .from('tax_jurisdictions')
      .select('name')
      .eq('id', resortRow.tax_jurisdiction_id)
      .maybeSingle();
    if (jurisdictionError) {
      if (!isMissingRelationError(jurisdictionError, ['42P01'])) {
        throw jurisdictionError;
      }
    } else {
      jurisdictionName = jurisdictionRow?.name ?? null;
    }
  }

  paymentSchedule = computePaymentSchedule({
    booking: booking ?? null,
    transactions: transactionList
      .filter((row) => row.direction === 'in')
      .map((row) => ({
        txn_type: row.txn_type ?? null,
        status: row.status ?? null,
        processor: row.processor ?? null,
        created_at: row.created_at ?? null,
      })),
    total_tax_cents: taxComputation.total_tax_cents,
    tax_warnings: taxComputation.warnings,
  });

  const expectedWarnings: string[] = [];
  const pointsValue =
    typeof booking?.total_points === 'number' && booking.total_points > 0
      ? booking.total_points
      : typeof match.points_reserved === 'number' && match.points_reserved > 0
        ? match.points_reserved
        : null;
  if (pointsValue === null) {
    expectedWarnings.push('Missing points');
  }
  if (lodgingTotalCents === null) {
    expectedWarnings.push('Missing total');
  }

  const platformFeeCents = pointsValue !== null ? Math.round(pointsValue * 500) : null;
  const ownerReceivableCents =
    platformFeeCents !== null && lodgingTotalCents !== null
      ? Math.max(0, lodgingTotalCents - platformFeeCents)
      : null;

  const bookingCancelled = booking?.status === 'cancelled';
  const invalidMatch =
    bookingCancelled && ['pending_owner', 'pending', 'offered'].includes(match.status ?? '');
  const expiresAt = match.expires_at ?? null;
  const expiresTime = expiresAt ? new Date(expiresAt).getTime() : null;
  const isExpiringSoon =
    expiresTime !== null &&
    expiresTime > now.getTime() &&
    expiresTime <= now.getTime() + 6 * 60 * 60 * 1000;

  return {
    match: match ?? null,
    booking: booking
      ? {
          ...booking,
          guest_total_cents: booking.guest_total_cents ?? null,
          est_cash: booking.est_cash ?? null,
          deposit_due: booking.deposit_due ?? null,
        }
      : null,
    owner: owner
      ? {
          id: owner.id,
          display_name: normalizeProfile(owner.profiles ?? null)?.display_name ?? null,
          email: normalizeProfile(owner.profiles ?? null)?.email ?? null,
        }
      : null,
    rental: rental ?? null,
    milestones,
    payouts,
    transactions: transactionList.map((row) => ({
      ...row,
      splits: splitMap.get(row.id) ?? [],
    })),
    paymentSchedule,
    taxBreakdown: {
      jurisdictionName,
      lines: taxComputation.tax_breakdown.map((row) => ({
        tax_type: row.tax_type,
        rate_bps: row.rate_bps,
        tax_cents: row.tax_cents,
      })),
      warnings: taxComputation.warnings,
    },
    expectedSplits: {
      platform_fee_cents: platformFeeCents,
      owner_receivable_cents: ownerReceivableCents,
      tax_liability_cents: taxComputation.total_tax_cents,
      warnings: expectedWarnings,
    },
    flags: {
      bookingCancelled,
      invalidMatch,
      hasRental: Boolean(rental?.id),
      payoutStatus,
      isExpiringSoon,
    },
  };
}

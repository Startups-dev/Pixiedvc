import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export type AdminMatchListFilters = {
  q?: string | null;
  matchStatus?: string | null;
  bookingStatus?: string | null;
  checkInFrom?: string | null;
  checkInTo?: string | null;
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
    match: Record<string, unknown>;
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
        lead_guest_email
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

  if (!isUuid(matchId)) {
    return {
      match: null,
      booking: null,
      owner: null,
      rental: null,
      milestones: [],
      payouts: [],
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
      'id, status, check_in, check_out, total_points, primary_resort_id, lead_guest_email, lead_guest_name, phone',
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
    booking: booking ?? null,
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
    flags: {
      bookingCancelled,
      invalidMatch,
      hasRental: Boolean(rental?.id),
      payoutStatus,
      isExpiringSoon,
    },
  };
}

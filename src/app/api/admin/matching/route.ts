import { NextResponse } from 'next/server';

import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { fetchAdminMatchList } from '@/lib/admin/matching';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function parseBoolean(value: string | null) {
  if (value === null) return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function parseHasRental(value: string | null) {
  if (!value || value === 'all') return null;
  return parseBoolean(value);
}

function parsePayoutStatus(value: string | null) {
  if (value === 'pending' || value === 'released') {
    return value;
  }
  return null;
}

function parseNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email ?? null)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  try {
    const result = await fetchAdminMatchList({
      authClient: supabase,
      filters: {
        q: params.get('q'),
        matchStatus: params.get('matchStatus'),
        bookingStatus: params.get('bookingStatus'),
        checkInFrom: params.get('checkInFrom'),
        checkInTo: params.get('checkInTo'),
        matchCreatedFrom: params.get('matchCreatedFrom'),
        matchCreatedTo: params.get('matchCreatedTo'),
        matchExpiresFrom: params.get('matchExpiresFrom'),
        matchExpiresTo: params.get('matchExpiresTo'),
        hasRental: parseHasRental(params.get('hasRental')),
        payoutStatus: parsePayoutStatus(params.get('payoutStatus')),
        sort: params.get('sort'),
        limit: parseNumber(params.get('limit')),
        offset: parseNumber(params.get('offset')),
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load matches.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

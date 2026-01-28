import RequestWorkstationClient, { type ActivityEntry, type RequestDetailRecord } from './RequestWorkstationClient';
import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type RequestRow = {
  id: string;
  status: string | null;
  availability_status: string | null;
  availability_checked_at: string | null;
  check_in: string | null;
  check_out: string | null;
  primary_room: string | null;
  max_price_per_point: number | null;
  adults: number | null;
  youths: number | null;
  lead_guest_name: string | null;
  lead_guest_email: string | null;
  lead_guest_phone: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  requires_accessibility: boolean | null;
  comments: string | null;
  primary_resort?: { name: string | null } | null;
};

type GuestRow = {
  id: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  age_category: string | null;
  age: number | null;
};

type ActivityRow = {
  id: string;
  request_id: string;
  kind: 'note' | 'status_change' | 'availability';
  body: string | null;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
  author_id: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

export default async function AdminRequestWorkstation({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const { supabase: sessionClient } = await requireAdminUser(`/admin/requests/${requestId}`);
  const supabaseAdmin = getSupabaseAdminClient();
  const supabase = supabaseAdmin ?? sessionClient;

  const { data: requestRow } = await supabase
    .from('booking_requests')
    .select(
      'id, status, availability_status, availability_checked_at, check_in, check_out, primary_room, max_price_per_point, adults, youths, lead_guest_name, lead_guest_email, lead_guest_phone, phone, address_line1, address_line2, city, state, postal_code, country, requires_accessibility, comments, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)',
    )
    .eq('id', requestId)
    .maybeSingle();

  if (!requestRow) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-[#e6e8ec]">
        <h1 className="text-2xl font-semibold">Request not found</h1>
      </div>
    );
  }

  const { data: activityRows } = await supabase
    .from('guest_request_activity')
    .select('id, request_id, kind, body, from_status, to_status, created_at, author_id')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  const { data: guestRows } = await supabase
    .from('booking_request_guests')
    .select('id, title, first_name, last_name, age_category, age')
    .eq('booking_id', requestId)
    .order('age_category', { ascending: true });

  const authorIds = Array.from(
    new Set((activityRows ?? []).map((row) => row.author_id).filter((id): id is string => Boolean(id))),
  );

  const { data: authorProfiles } = authorIds.length
    ? await supabase.from('profiles').select('id, display_name, email').in('id', authorIds)
    : { data: [] };

  const profileMap = new Map<string, ProfileRow>();
  for (const profile of authorProfiles ?? []) {
    if (profile?.id) {
      profileMap.set(profile.id, profile);
    }
  }

  const activity: ActivityEntry[] = (activityRows ?? []).map((row: ActivityRow) => {
    const authorProfile = row.author_id ? profileMap.get(row.author_id) : null;
    return {
      id: row.id,
      kind: row.kind,
      createdAt: row.created_at,
      author: authorProfile?.display_name ?? authorProfile?.email ?? null,
      body: row.body,
      fromStatus: row.from_status,
      toStatus: row.to_status,
    };
  });

  const request: RequestDetailRecord = {
    id: requestRow.id,
    status: requestRow.status,
    availabilityStatus: requestRow.availability_status ?? null,
    availabilityCheckedAt: requestRow.availability_checked_at ?? null,
    resortName: requestRow.primary_resort?.name ?? null,
    checkIn: requestRow.check_in,
    checkOut: requestRow.check_out,
    roomType: requestRow.primary_room,
    partySize: partyLabel(requestRow.adults, requestRow.youths),
    maxPrice: requestRow.max_price_per_point ? `$${requestRow.max_price_per_point.toFixed(2)}` : 'No max',
    renterName: requestRow.lead_guest_name,
    renterEmail: requestRow.lead_guest_email,
    renterPhone: requestRow.lead_guest_phone ?? requestRow.phone ?? null,
    addressLine1: requestRow.address_line1,
    addressLine2: requestRow.address_line2,
    city: requestRow.city,
    state: requestRow.state,
    postalCode: requestRow.postal_code,
    country: requestRow.country,
    requiresAccessibility: requestRow.requires_accessibility ?? null,
    specialNotes: requestRow.comments ?? null,
    resortLabel: requestRow.primary_resort?.name ?? null,
    roomTypeLabel: requestRow.primary_room ?? null,
    guests: (guestRows as GuestRow[] | null) ?? [],
    activity,
  };

  return <RequestWorkstationClient request={request} />;
}

function partyLabel(adults: number | null, youths: number | null) {
  const a = adults ?? 0;
  const c = youths ?? 0;
  const parts = [];
  if (a) {
    parts.push(`${a} adult${a === 1 ? '' : 's'}`);
  }
  if (c) {
    parts.push(`${c} kid${c === 1 ? '' : 's'}`);
  }
  return parts.length ? parts.join(' · ') : 'No guests set';
}

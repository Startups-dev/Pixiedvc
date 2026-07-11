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
  affiliate_id: string | null;
  affiliate_click_id: string | null;
  visitor_session_row_id: string | null;
  visitor_session_id: string | null;
  visitor_id: string | null;
  attribution_source: string | null;
  referral_code: string | null;
  referral_utm_source: string | null;
  referral_utm_medium: string | null;
  referral_utm_campaign: string | null;
  referral_utm_term: string | null;
  referral_utm_content: string | null;
  primary_resort?: { name: string | null } | null;
  affiliate?: {
    id: string;
    display_name: string | null;
    email: string | null;
    slug: string | null;
    status: string | null;
    tier: string | null;
  } | null;
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
      'id, status, availability_status, availability_checked_at, check_in, check_out, primary_room, max_price_per_point, adults, youths, lead_guest_name, lead_guest_email, lead_guest_phone, phone, address_line1, address_line2, city, state, postal_code, country, requires_accessibility, comments, affiliate_id, affiliate_click_id, visitor_session_row_id, visitor_session_id, visitor_id, attribution_source, referral_code, referral_utm_source, referral_utm_medium, referral_utm_campaign, referral_utm_term, referral_utm_content, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name), affiliate:affiliates!booking_requests_affiliate_id_fkey(id, display_name, email, slug, status, tier)',
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

  const row = requestRow as unknown as RequestRow;

  const request: RequestDetailRecord = {
    id: row.id,
    status: row.status,
    availabilityStatus: row.availability_status ?? null,
    availabilityCheckedAt: row.availability_checked_at ?? null,
    resortName: row.primary_resort?.name ?? null,
    checkIn: row.check_in,
    checkOut: row.check_out,
    roomType: row.primary_room,
    partySize: partyLabel(row.adults, row.youths),
    maxPrice: row.max_price_per_point ? `$${row.max_price_per_point.toFixed(2)}` : 'No max',
    renterName: row.lead_guest_name,
    renterEmail: row.lead_guest_email,
    renterPhone: row.lead_guest_phone ?? row.phone ?? null,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    requiresAccessibility: row.requires_accessibility ?? null,
    specialNotes: row.comments ?? null,
    resortLabel: row.primary_resort?.name ?? null,
    roomTypeLabel: row.primary_room ?? null,
    guests: (guestRows as GuestRow[] | null) ?? [],
    activity,
    affiliateAttribution: {
      affiliateId: row.affiliate_id,
      affiliateClickId: row.affiliate_click_id,
      visitorSessionRowId: row.visitor_session_row_id,
      visitorSessionId: row.visitor_session_id,
      visitorId: row.visitor_id,
      attributionSource: row.attribution_source,
      referralCode: row.referral_code,
      utmSource: row.referral_utm_source,
      utmMedium: row.referral_utm_medium,
      utmCampaign: row.referral_utm_campaign,
      utmTerm: row.referral_utm_term,
      utmContent: row.referral_utm_content,
      affiliate: row.affiliate
        ? {
            id: row.affiliate.id,
            displayName: row.affiliate.display_name,
            email: row.affiliate.email,
            slug: row.affiliate.slug,
            status: row.affiliate.status,
            tier: row.affiliate.tier,
          }
        : null,
    },
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

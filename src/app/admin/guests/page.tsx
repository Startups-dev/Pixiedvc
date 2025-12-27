import GuestRequestBoard, { ActivityEntry, GuestRequestRecord } from './guest-requests';
import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type RequestRow = {
  id: string;
  renter_id: string | null;
  status: string | null;
  created_at: string;
  check_in: string | null;
  check_out: string | null;
  primary_room: string | null;
  adults: number | null;
  youths: number | null;
  lead_guest_name: string | null;
  lead_guest_email: string | null;
  primary_resort?: { name: string | null } | null;
};

type ActivityRow = {
  id: string;
  request_id: string;
  kind: 'note' | 'status_change';
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

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

export default async function AdminGuestsPage() {
  const { supabase: sessionClient } = await requireAdminUser('/admin/guests');
  const supabaseAdmin = getSupabaseAdminClient();
  const supabase = supabaseAdmin ?? sessionClient;

  const { data: requestRows, error } = await supabase
    .from('booking_requests')
    .select(
      'id, renter_id, status, created_at, check_in, check_out, primary_room, adults, youths, lead_guest_name, lead_guest_email, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)'
    )
    .order('created_at', { ascending: false })
    .limit(75);

  if (error) {
    console.error('Failed to load guest requests', error);
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-slate-700">
        <h1 className="text-2xl font-semibold text-rose-600">Unable to load guest requests</h1>
        <p className="text-slate-600">Check Supabase credentials or try again shortly.</p>
      </div>
    );
  }

  const requestIds = (requestRows ?? []).map((row) => row.id);
  const renterIds = Array.from(new Set((requestRows ?? []).map((row) => row.renter_id).filter((id): id is string => Boolean(id))));

  const activityPromise = requestIds.length
    ? supabase
        .from('guest_request_activity')
        .select('id, request_id, kind, body, from_status, to_status, created_at, author_id')
        .in('request_id', requestIds)
        .order('created_at', { ascending: false })
    : Promise.resolve({ data: [], error: null });

  const statusPromise = supabase.from('booking_requests').select('status');

  const profilePromise = renterIds.length
    ? supabase.from('profiles').select('id, display_name, email').in('id', renterIds)
    : Promise.resolve({ data: [], error: null });

  const authorPromise = activityPromise.then((activityResult) => {
    const authorIds = Array.from(
      new Set(
        (activityResult.data as ActivityRow[])?.map((row) => row.author_id).filter((id): id is string => Boolean(id)) ?? [],
      ),
    );
    if (!authorIds.length) {
      return { data: [], error: null };
    }
    return supabase.from('profiles').select('id, display_name, email').in('id', authorIds);
  });

  const [{ data: activityRows }, { data: statusRows }, { data: renterProfiles }, authorProfilesResult] = await Promise.all([
    activityPromise,
    statusPromise,
    profilePromise,
    authorPromise,
  ]);

  const authorProfiles = authorProfilesResult.data ?? [];

  const profileMap = new Map<string, ProfileRow>();
  for (const profile of [...(renterProfiles ?? []), ...authorProfiles]) {
    if (profile?.id) {
      profileMap.set(profile.id, profile);
    }
  }

  const activityMap = new Map<string, ActivityEntry[]>();
  for (const row of (activityRows ?? []) as ActivityRow[]) {
    const list = activityMap.get(row.request_id) ?? [];
    const authorProfile = row.author_id ? profileMap.get(row.author_id) : null;
    list.push({
      id: row.id,
      kind: row.kind,
      createdAt: row.created_at,
      author: authorProfile?.display_name ?? authorProfile?.email ?? null,
      body: row.body,
      fromStatus: row.from_status,
      toStatus: row.to_status,
    });
    activityMap.set(row.request_id, list);
  }

  for (const entries of activityMap.values()) {
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const records: GuestRequestRecord[] = (requestRows ?? []).map((row: RequestRow) => {
    const renter = row.renter_id ? profileMap.get(row.renter_id) : null;
    return {
      id: row.id,
      status: row.status ?? 'submitted',
      createdAt: dateFormatter.format(new Date(row.created_at)),
      checkIn: row.check_in,
      checkOut: row.check_out,
      roomType: row.primary_room,
      adults: row.adults,
      children: row.youths,
      maxPrice: null,
      resortName: row.primary_resort?.name ?? null,
      renterName: row.lead_guest_name ?? renter?.display_name ?? null,
      renterEmail: row.lead_guest_email ?? renter?.email ?? null,
      activity: activityMap.get(row.id) ?? [],
    };
  });

  const statusCounts: Record<string, number> = {};
  for (const row of statusRows ?? []) {
    const label = row.status ?? 'submitted';
    statusCounts[label] = (statusCounts[label] ?? 0) + 1;
  }
  statusCounts.all = (statusRows ?? []).length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h1 className="text-3xl font-semibold text-slate-900">Guest Requests</h1>
        <p className="text-slate-600">Concierge workspace for matching renters to available owner points.</p>
      </div>

      <div className="mt-8">
        <GuestRequestBoard requests={records} statusCounts={statusCounts} />
      </div>
    </div>
  );
}

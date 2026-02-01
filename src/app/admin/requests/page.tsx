import RequestsInboxClient, { type RequestInboxRecord } from './RequestsInboxClient';
import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type RequestRow = {
  id: string;
  request_number: number | null;
  renter_id: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  check_in: string | null;
  check_out: string | null;
  primary_room: string | null;
  adults: number | null;
  youths: number | null;
  max_price_per_point: number | null;
  lead_guest_name: string | null;
  lead_guest_email: string | null;
  primary_resort?: { name: string | null } | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

export default async function AdminRequestsPage() {
  const { supabase: sessionClient } = await requireAdminUser('/admin/requests');
  const supabaseAdmin = getSupabaseAdminClient();
  const supabase = supabaseAdmin ?? sessionClient;

  const { data: requestRows, error } = await supabase
    .from('booking_requests')
    .select(
      'id, request_number, renter_id, status, created_at, updated_at, check_in, check_out, primary_room, adults, youths, max_price_per_point, lead_guest_name, lead_guest_email, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)'
    )
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Failed to load booking requests', error);
    return (
      <div className="min-h-screen bg-[#0f1115] px-6 py-12 text-[#e6e8ec]">
        <h1 className="text-2xl font-semibold text-rose-400">Unable to load requests</h1>
        <p className="text-[#9aa3b2]">Check Supabase credentials or try again shortly.</p>
      </div>
    );
  }

  const renterIds = Array.from(
    new Set((requestRows ?? []).map((row) => row.renter_id).filter((id): id is string => Boolean(id))),
  );

  const profilePromise = renterIds.length
    ? supabase.from('profiles').select('id, display_name, email').in('id', renterIds)
    : Promise.resolve({ data: [], error: null });

  const statusPromise = supabase.from('booking_requests').select('status');

  const [{ data: renterProfiles }, { data: statusRows }] = await Promise.all([profilePromise, statusPromise]);

  const profileMap = new Map<string, ProfileRow>();
  for (const profile of renterProfiles ?? []) {
    if (profile?.id) {
      profileMap.set(profile.id, profile);
    }
  }

  const records: RequestInboxRecord[] = (requestRows ?? []).map((row: RequestRow) => {
    const renter = row.renter_id ? profileMap.get(row.renter_id) : null;
    return {
      id: row.id,
      requestNumber: row.request_number ?? null,
      status: row.status ?? 'submitted',
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
      checkIn: row.check_in,
      checkOut: row.check_out,
      roomType: row.primary_room,
      adults: row.adults,
      children: row.youths,
      maxPrice: row.max_price_per_point,
      resortName: row.primary_resort?.name ?? null,
      renterName: row.lead_guest_name ?? renter?.display_name ?? null,
      renterEmail: row.lead_guest_email ?? renter?.email ?? null,
    };
  });

  const statusCounts: Record<string, number> = {};
  for (const row of statusRows ?? []) {
    const label = row.status ?? 'submitted';
    statusCounts[label] = (statusCounts[label] ?? 0) + 1;
  }
  statusCounts.all = (statusRows ?? []).length;

  return (
    <div className="min-h-screen bg-[#0f1115] px-6 py-12 text-[#e6e8ec]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6b7280]">Admin</p>
          <h1 className="text-3xl font-semibold text-[#e6e8ec]">Requests</h1>
          <p className="text-[#9aa3b2]">
            Triage incoming requests and move them into matching when ready.
          </p>
        </header>

        <RequestsInboxClient requests={records} statusCounts={statusCounts} />
      </div>
    </div>
  );
}

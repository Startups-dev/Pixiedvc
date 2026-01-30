import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { isAdminEmail } from '@/lib/admin';

export type OwnerDetailRow = {
  id: string;
  verification: string | null;
  rejection_reason: string | null;
  home_resort: string | null;
  use_year: string | null;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
};

export type OwnerMembershipRow = {
  id: string;
  owner_id: string | null;
  use_year: string | null;
  points_owned: number | null;
  points_available: number | null;
  resort: { name: string | null } | null;
};

export type OwnerDocumentRow = {
  id: string;
  owner_id: string | null;
  kind: string | null;
  storage_path: string;
  created_at: string;
};

export type OwnerContractRow = {
  id: number;
  contract_body?: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string | null;
  sent_at: string | null;
  last_sent_to_owner: string | null;
  last_sent_to_guest: string | null;
  booking_request_id: string | null;
  snapshot: Record<string, unknown> | null;
};

export type ContractEventRow = {
  id: string;
  contract_id: number;
  event_type: string;
  created_at: string;
};

export async function fetchOwnerQueue(statusFilter: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      console.warn('[fetchOwnerQueue] No service key and user not admin; returning empty queue.');
      return { owners: [], memberships: [], documents: [] };
    }

    const owners = await supabase
      .from('owner_admin_queue')
      .select('*')
      .eq('status', statusFilter)
      .order('submitted_at', { ascending: false })
      .limit(50);

    return owners;
  }

  const owners = await supabaseAdmin
    .from('owner_queue_view')
    .select('*')
    .eq('status', statusFilter)
    .order('submitted_at', { ascending: false })
    .limit(50);

  return owners;
}

export async function fetchOwnerById(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await supabase
    .from('owners')
    .select('id, verification, rejection_reason, home_resort, use_year, profiles:profiles!owners_user_id_fkey(display_name, email)')
    .eq('id', ownerId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data ?? null) as OwnerDetailRow | null;
}

export async function fetchOwnerMemberships(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await supabase
    .from('owner_memberships')
    .select('id, owner_id, use_year, points_owned, points_available, resort:resorts(name)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as OwnerMembershipRow[];
}

export async function fetchOwnerDocuments(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await supabase
    .from('owner_documents')
    .select('id, owner_id, kind, storage_path, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as OwnerDocumentRow[];
}

export async function fetchContractsForOwner(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as OwnerContractRow[];
}

export async function fetchContractEvents(supabase: SupabaseClient, contractIds: number[]) {
  if (contractIds.length === 0) {
    return [] as ContractEventRow[];
  }
  const { data, error } = await supabase
    .from('contract_events')
    .select('id, contract_id, event_type, created_at')
    .in('contract_id', contractIds)
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as ContractEventRow[];
}

import OwnerQueue from './owner-queue';
import type { QueueOwnerDocument, QueueOwnerMembership, QueueOwnerRecord } from './types';
import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const STATUS_OPTIONS = ['pending', 'needs_more_info', 'verified', 'rejected', 'all'];

type OwnerRow = {
  id: string;
  verification: string | null;
  created_at: string | null;
  profiles?: {
    display_name: string | null;
    email: string | null;
  } | null;
};

type MembershipRow = {
  id: string;
  owner_id: string;
  use_year: string | null;
  points_owned: number | null;
  points_available: number | null;
  resort?: { name?: string | null } | null;
};

type DocumentRow = {
  id: string;
  owner_id: string;
  kind: string | null;
  storage_path: string;
  created_at: string;
};

export default async function OwnersAdminPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const statusParam = typeof searchParams.status === 'string' ? searchParams.status : 'pending';
  const statusFilter = STATUS_OPTIONS.includes(statusParam) ? statusParam : 'pending';

  const { supabase: sessionClient } = await requireAdminUser('/admin/owners');

  const supabaseAdmin = getSupabaseAdminClient();
  const supabase = supabaseAdmin ?? sessionClient;

  const baseQuery = supabase
    .from('owners')
    .select('id, verification, created_at, profiles:profiles!owners_user_id_fkey(display_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (statusFilter !== 'all') {
    baseQuery.eq('verification', statusFilter);
  }

  const { data: ownerRows, error } = await baseQuery;

  if (error) {
    console.error('Failed to load owners', JSON.stringify(error, null, 2));
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-4">
        <h1 className="text-2xl font-semibold text-rose-600">Unable to load owner queue</h1>
        <p className="text-slate-600">
          Check your Supabase connection and RLS policies. You can also add
          <code className="mx-1 rounded bg-slate-100 px-2 py-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>
          to `.env.local` for local admin access.
        </p>
        <p className="text-sm">
          <a href="/admin" className="text-indigo-600 hover:underline">
            ← Return to admin home
          </a>
        </p>
      </div>
    );
  }

  const owners = (ownerRows ?? []) as OwnerRow[];
  const ownerIds = owners.map((owner) => owner.id);

  const [membershipRows, documentRows, commentRows, eventRows] = ownerIds.length
    ? await Promise.all([
        supabase
          .from('owner_memberships')
          .select('id, owner_id, use_year, points_owned, points_available, resort:resorts(name)')
          .in('owner_id', ownerIds),
        supabase
          .from('owner_documents')
          .select('id, owner_id, kind, storage_path, created_at')
          .in('owner_id', ownerIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('owner_comments')
          .select('id, owner_id, author_id, body, created_at, kind')
          .in('owner_id', ownerIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('owner_verification_events')
          .select('id, owner_id, old_status, new_status, actor_id, created_at')
          .in('owner_id', ownerIds)
          .order('created_at', { ascending: false }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (membershipRows.error) {
    console.error('Failed to load owner memberships', membershipRows.error);
  }
  if (documentRows.error) {
    console.error('Failed to load owner documents', documentRows.error);
  }
  if (commentRows.error) {
    console.error('Failed to load owner comments', commentRows.error);
  }
  if (eventRows.error) {
    console.error('Failed to load verification events', eventRows.error);
  }

  const membershipMap = new Map<string, QueueOwnerMembership[]>();
  for (const membership of (membershipRows.data ?? []) as MembershipRow[]) {
    const ownerId = membership.owner_id;
    if (!ownerId) {
      continue;
    }
    const list = membershipMap.get(ownerId) ?? [];
    list.push({
      id: membership.id,
      resortName: membership.resort?.name ?? null,
      useYear: membership.use_year ?? null,
      pointsOwned: membership.points_owned ?? null,
      pointsAvailable: membership.points_available ?? null,
    });
    membershipMap.set(ownerId, list);
  }

const documentMap = new Map<string, QueueOwnerDocument[]>();
  const documents = (documentRows.data ?? []) as DocumentRow[];
  const previewMap = await buildDocumentPreviewMap(supabaseAdmin, documents);

  for (const doc of documents) {
    const ownerId = doc.owner_id;
    if (!ownerId) {
      continue;
    }
    const list = documentMap.get(ownerId) ?? [];
    list.push({
      id: doc.id,
      kind: doc.kind ?? 'document',
      storagePath: doc.storage_path,
      createdAt: doc.created_at,
      previewUrl: previewMap.get(doc.storage_path) ?? null,
    });
    documentMap.set(ownerId, list);
  }

  const activityMap = new Map<string, QueueOwnerRecord['activity']>();

  for (const comment of (commentRows.data ?? []) as CommentRow[]) {
    const list = activityMap.get(comment.owner_id) ?? [];
    list.push({
      id: comment.id,
      type: 'comment',
      createdAt: comment.created_at,
      authorId: comment.author_id,
      body: comment.body ?? '',
    });
    activityMap.set(comment.owner_id, list);
  }

  for (const event of (eventRows.data ?? []) as EventRow[]) {
    const list = activityMap.get(event.owner_id) ?? [];
    list.push({
      id: event.id,
      type: 'event',
      createdAt: event.created_at,
      authorId: event.actor_id,
      statusTransition: {
        from: event.old_status,
        to: event.new_status,
      },
    });
    activityMap.set(event.owner_id, list);
  }

  for (const entries of activityMap.values()) {
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const queueRecords: QueueOwnerRecord[] = owners.map((owner) => ({
    id: owner.id,
    status: owner.verification ?? 'pending',
    submittedAt: owner.created_at,
    displayName: owner.profiles?.display_name ?? null,
    email: null,
    memberships: membershipMap.get(owner.id) ?? [],
    documents: documentMap.get(owner.id) ?? [],
    activity: activityMap.get(owner.id) ?? [],
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <OwnerQueue owners={queueRecords} statusFilter={statusFilter} />
    </div>
  );
}

async function buildDocumentPreviewMap(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  documents: DocumentRow[],
) {
  const map = new Map<string, string>();
  if (!documents.length) {
    return map;
  }

  const bucket = 'owner-docs';
  const paths = documents.map((doc) => doc.storage_path).filter(Boolean);

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrls(paths, 60 * 10);
    if (!error && data) {
      data.forEach((entry, index) => {
        if (entry.signedUrl) {
          map.set(paths[index], entry.signedUrl);
        }
      });
    }
  }

  if (!map.size && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    paths.forEach((path) => {
      map.set(path, `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`);
    });
  }

  return map;
}

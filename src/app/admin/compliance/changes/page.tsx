import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import AdminReleaseChangesClient from './AdminReleaseChangesClient';

export default async function ComplianceChangesPage() {
  const { supabase: sessionClient, user } = await requireAdminUser('/admin/compliance/changes');
  const supabaseAdmin = getSupabaseAdminClient();
  const supabase = supabaseAdmin ?? sessionClient;

  const { data: rows } = await supabase
    .from('release_changes')
    .select(
      'id, environment, release_version, description, deployed_by, approved_by, deployed_at, rollback_available, notes',
    )
    .order('deployed_at', { ascending: false })
    .limit(200);

  const defaultReleaseVersion =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    null;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin · Compliance</p>
        <h1 className="text-3xl font-semibold text-slate-900">Change management</h1>
        <p className="text-sm text-slate-500">
          Record releases and approvals for SOC 2 change management evidence.
        </p>
      </header>

      <AdminReleaseChangesClient
        initialRows={(rows ?? []) as typeof rows}
        defaultReleaseVersion={defaultReleaseVersion}
        defaultEmail={user.email ?? null}
      />
    </main>
  );
}

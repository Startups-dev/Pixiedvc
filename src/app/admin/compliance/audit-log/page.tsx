import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export default async function AdminAuditLogPage() {
  const { supabase: sessionClient } = await requireAdminUser('/admin/compliance/audit-log');
  const supabaseAdmin = getSupabaseAdminClient();
  const supabase = supabaseAdmin ?? sessionClient;

  const { data: rows, error } = await supabase
    .from('admin_audit_events')
    .select(
      'id, created_at, actor_email, action, entity_type, entity_id, meta',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-12">
        <h1 className="text-2xl font-semibold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-500">Unable to load audit events.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin · Compliance</p>
        <h1 className="text-3xl font-semibold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-500">
          Recent admin audit events for SOC 2 evidence.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Meta</th>
              </tr>
            </thead>
            <tbody>
              {rows?.length ? (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-xs text-slate-600">{row.created_at}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.actor_email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{row.action}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.entity_type ?? '—'}
                      {row.entity_id ? ` · ${row.entity_id}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.meta && Object.keys(row.meta).length ? (
                        <details>
                          <summary className="cursor-pointer text-xs text-slate-500">
                            View
                          </summary>
                          <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
                            {JSON.stringify(row.meta, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No audit events found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

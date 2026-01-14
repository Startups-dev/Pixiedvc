import { requireAdminUser } from '@/lib/admin';

export default async function ComplianceIncidentsPage() {
  await requireAdminUser('/admin/compliance/incidents');

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin · Compliance</p>
        <h1 className="text-3xl font-semibold text-slate-900">Incidents</h1>
        <p className="text-sm text-slate-500">Coming soon.</p>
      </header>
    </main>
  );
}

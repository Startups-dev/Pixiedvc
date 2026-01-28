import { readdir, readFile } from 'fs/promises';
import path from 'path';
import Link from 'next/link';

import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

async function listAdminPages(dir: string, baseDir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listAdminPages(fullPath, baseDir)));
    } else if (entry.isFile() && entry.name === 'page.tsx') {
      files.push(fullPath);
    }
  }

  return files.map((file) => path.relative(baseDir, file));
}

function toRouteFromPage(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, '/');
  const withoutPrefix = normalized.replace(/^src\/app\//, '').replace(/\/page\.tsx$/, '');
  return `/${withoutPrefix}`;
}

async function scanAdminGuards() {
  const baseDir = process.cwd();
  const adminDir = path.join(baseDir, 'src', 'app', 'admin');
  const pages = await listAdminPages(adminDir, baseDir);
  const guardPatterns = ['requireAdminUser', 'emailIsAllowedForAdmin', 'isAdminEmailStrict'];
  const missing: string[] = [];

  for (const relativePath of pages) {
    const content = await readFile(path.join(baseDir, relativePath), 'utf8');
    const hasGuard = guardPatterns.some((pattern) => content.includes(pattern));
    if (!hasGuard) {
      missing.push(toRouteFromPage(relativePath));
    }
  }

  return { verified: missing.length === 0, missing };
}

export default async function ComplianceHubPage() {
  const { supabase: sessionClient } = await requireAdminUser('/admin/compliance');
  const supabaseAdmin = getSupabaseAdminClient();
  const supabase = supabaseAdmin ?? sessionClient;

  const guardScan = await scanAdminGuards();

  const [
    envResult,
    vendorResult,
    categoryResult,
    componentResult,
    auditResult,
    releaseResult,
    releaseCountResult,
  ] = await Promise.all([
    supabase.from('compliance_environments').select('id').limit(1000),
    supabase.from('compliance_vendors').select('id, name, compliance_reference').limit(1000),
    supabase.from('compliance_data_categories').select('id').limit(1000),
    supabase.from('compliance_components').select('id').limit(1000),
    supabase
      .from('admin_audit_events')
      .select('id, created_at, action')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('release_changes')
      .select('id, deployed_at, environment')
      .eq('environment', 'production')
      .order('deployed_at', { ascending: false })
      .limit(1),
    supabase
      .from('release_changes')
      .select('id', { count: 'exact', head: true })
      .gte('deployed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const envCount = envResult.data?.length ?? 0;
  const vendorRows = vendorResult.data ?? [];
  const vendorCount = vendorRows.length;
  const categoryCount = categoryResult.data?.length ?? 0;
  const componentCount = componentResult.data?.length ?? 0;
  const auditRows = auditResult.data ?? [];
  const latestAudit = auditRows[0];
  const latestProductionRelease = releaseResult.data?.[0] ?? null;
  const releasesLast30Days = releaseCountResult.count ?? 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const auditLast7Days = auditRows.filter((row) =>
    row.created_at ? new Date(row.created_at) >= sevenDaysAgo : false,
  ).length;

  const baselineReady = envCount > 0 && vendorCount > 0 && categoryCount > 0 && componentCount > 0;
  const auditReady = auditRows.length > 0;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin · Compliance</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">Compliance Hub</h1>
          <a
            href="/admin"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
          >
            Back to Admin
          </a>
        </div>
        <p className="text-sm text-slate-500">
          Single pane of glass for SOC 2 readiness evidence and posture.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Readiness</p>
            <h2 className="text-xl font-semibold text-slate-900">SOC 2 Type I readiness</h2>
            <p className="text-sm text-slate-500">Status: IN PROGRESS</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                baselineReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              Baseline {baselineReady ? 'ready' : 'incomplete'}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                auditReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              Audit log {auditReady ? 'active' : 'missing'}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Access reviews pending
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Policies pending
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Scope & baseline</p>
              <h3 className="text-lg font-semibold text-slate-900">Baseline inventory</h3>
            </div>
            <a
              href="/admin/compliance/baseline"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
            >
              View
            </a>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Environments</span>
              <span className="font-semibold text-slate-900">{envCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Vendors</span>
              <span className="font-semibold text-slate-900">{vendorCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Data categories</span>
              <span className="font-semibold text-slate-900">{categoryCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Components</span>
              <span className="font-semibold text-slate-900">{componentCount}</span>
            </div>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Admin routes verified: <span className="font-semibold">
                {guardScan.verified ? 'YES' : 'NO'}
              </span>
              {!guardScan.verified ? (
                <div className="mt-1 text-xs text-rose-600">
                  Missing guard on: {guardScan.missing.join(', ')}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Audit evidence</p>
              <h3 className="text-lg font-semibold text-slate-900">Audit log</h3>
            </div>
            <a
              href="/admin/compliance/audit-log"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
            >
              View
            </a>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Events (last 7 days)</span>
              <span className="font-semibold text-slate-900">{auditLast7Days}</span>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
              Latest: {latestAudit?.action ?? 'No audit events yet'}
              {latestAudit?.created_at ? ` · ${latestAudit.created_at}` : ''}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Access reviews</p>
              <h3 className="text-lg font-semibold text-slate-900">Reviews</h3>
            </div>
            <a
              href="/admin/compliance/access-reviews"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
            >
              View
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-500">No access reviews recorded yet.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Change management</p>
              <h3 className="text-lg font-semibold text-slate-900">Release evidence</h3>
            </div>
            <a
              href="/admin/compliance/changes"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
            >
              View
            </a>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>
              Last production release:{' '}
              <span className="font-semibold text-slate-900">
                {latestProductionRelease?.deployed_at ?? 'No releases yet'}
              </span>
            </p>
            <p>
              Releases in last 30 days:{' '}
              <span className="font-semibold text-slate-900">{releasesLast30Days}</span>
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Incidents</p>
              <h3 className="text-lg font-semibold text-slate-900">Incident log</h3>
            </div>
            <a
              href="/admin/compliance/incidents"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
            >
              View
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-500">No incidents recorded yet.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Policies</p>
              <h3 className="text-lg font-semibold text-slate-900">Policy set</h3>
            </div>
            <Link
              href="/admin/compliance/policies"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
            >
              View
            </Link>
          </div>
          <div className="mt-3 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Available
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-500">
            <li>Information Security</li>
            <li>Access Control</li>
            <li>Incident Response</li>
            <li>Change Management</li>
            <li>Vendor Management</li>
            <li>Data Retention</li>
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Vendor compliance</p>
            <h3 className="text-lg font-semibold text-slate-900">Top vendors</h3>
          </div>
          <a
            href="/admin/compliance/baseline"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
          >
            View
          </a>
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          {vendorRows.slice(0, 5).map((vendor) => (
            <div key={vendor.name} className="flex items-center justify-between">
              <span>{vendor.name}</span>
              {vendor.compliance_reference ? (
                <span className="text-xs text-slate-500">{vendor.compliance_reference}</span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                  TBD
                </span>
              )}
            </div>
          ))}
          {vendorRows.length === 0 ? (
            <p className="text-sm text-slate-500">No vendor records found.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

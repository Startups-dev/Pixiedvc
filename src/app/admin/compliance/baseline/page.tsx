import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

type GuardScanResult = {
  verified: boolean;
  missing: string[];
};

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

async function scanAdminGuards(): Promise<GuardScanResult> {
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

export default async function ComplianceBaselinePage() {
  const { supabase: sessionClient } = await requireAdminUser('/admin/compliance/baseline');
  const supabaseAdmin = getSupabaseAdminClient();
  const supabase = supabaseAdmin ?? sessionClient;

  const guardScan = await scanAdminGuards();

  const [envResult, vendorResult, categoryResult, componentResult] = await Promise.all([
    supabase
      .from('compliance_environments')
      .select('name, hosting_provider, database_provider, auth_provider, notes')
      .order('name', { ascending: true }),
    supabase
      .from('compliance_vendors')
      .select('name, service_category, data_accessed, compliance_reference, in_scope')
      .order('name', { ascending: true }),
    supabase
      .from('compliance_data_categories')
      .select('name, description')
      .order('name', { ascending: true }),
    supabase
      .from('compliance_components')
      .select('name, description, in_scope')
      .order('name', { ascending: true }),
  ]);

  const envRows = envResult.data ?? [];
  const vendorRows = vendorResult.data ?? [];
  const categoryRows = categoryResult.data ?? [];
  const componentRows = componentResult.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin · Compliance</p>
        <h1 className="text-3xl font-semibold text-slate-900">SOC 2 baseline inventory</h1>
        <p className="text-sm text-slate-500">
          Define scope and verify admin gating before SOC 2 control workstreams.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Admin gate verification</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
              guardScan.verified
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            Admin routes verified: {guardScan.verified ? 'YES' : 'NO'}
          </span>
          {!guardScan.verified ? (
            <span className="text-xs text-rose-600">
              Missing guard on: {guardScan.missing.join(', ')}
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Environments</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Environment</th>
                <th className="px-4 py-3">Hosting</th>
                <th className="px-4 py-3">Database</th>
                <th className="px-4 py-3">Auth</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {envRows.length ? (
                envRows.map((row) => (
                  <tr key={row.name} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.hosting_provider}</td>
                    <td className="px-4 py-3 text-slate-600">{row.database_provider}</td>
                    <td className="px-4 py-3 text-slate-600">{row.auth_provider}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.notes ?? '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No environment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">In-scope vendors</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Data accessed</th>
                <th className="px-4 py-3">Compliance</th>
                <th className="px-4 py-3">In scope</th>
              </tr>
            </thead>
            <tbody>
              {vendorRows.length ? (
                vendorRows.map((row) => (
                  <tr key={row.name} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.service_category}</td>
                    <td className="px-4 py-3 text-slate-600">{row.data_accessed}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.compliance_reference ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                          row.in_scope
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.in_scope ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No vendor records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Data categories</p>
          <ul className="mt-3 space-y-3 text-sm text-slate-700">
            {categoryRows.length ? (
              categoryRows.map((row) => (
                <li key={row.name} className="rounded-2xl border border-slate-100 p-3">
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.description}</p>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-500">No data categories found.</li>
            )}
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">In-scope components</p>
          <ul className="mt-3 space-y-3 text-sm text-slate-700">
            {componentRows.length ? (
              componentRows.map((row) => (
                <li key={row.name} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.description}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                        row.in_scope
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {row.in_scope ? 'In scope' : 'Out of scope'}
                    </span>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-500">No components found.</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

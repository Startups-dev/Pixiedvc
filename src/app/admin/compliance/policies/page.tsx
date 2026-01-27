import Link from 'next/link';

import { requireAdminUser } from '@/lib/admin';
import { loadMdxDirectory } from '@/lib/mdx';

export default async function CompliancePoliciesPage() {
  await requireAdminUser('/admin/compliance/policies');

  const policies = await loadMdxDirectory('compliance/policies').catch(() => []);

  const policyOrder = [
    'Information Security Policy',
    'Access Control Policy',
    'Incident Response Policy',
    'Change Management Policy',
    'Vendor Management Policy',
    'Data Retention Policy',
  ];

  const sortedPolicies = [...policies].sort((a, b) => {
    const aIndex = policyOrder.indexOf(a.meta.title);
    const bIndex = policyOrder.indexOf(b.meta.title);
    const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    if (normalizedA !== normalizedB) {
      return normalizedA - normalizedB;
    }
    return a.meta.title.localeCompare(b.meta.title);
  });

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin · Compliance</p>
        <h1 className="text-3xl font-semibold text-slate-900">Policies</h1>
        <p className="text-sm text-slate-500">Approved policies used for SOC readiness.</p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Policy set</h2>
          <Link
            href="/admin/compliance"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
          >
            Back to compliance
          </Link>
        </div>

        {sortedPolicies.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No policies published yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {sortedPolicies.map((policy) => (
              <div
                key={policy.slug}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{policy.meta.title}</p>
                  {policy.meta.summary ? (
                    <p className="text-sm text-slate-500">{policy.meta.summary}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span>Last updated: {policy.meta.updated ?? '—'}</span>
                  <Link href={`/admin/compliance/policies/${policy.slug}`} className="hover:text-slate-600">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

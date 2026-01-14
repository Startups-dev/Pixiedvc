import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireAdminUser } from '@/lib/admin';
import { loadMdx } from '@/lib/mdx';

type PolicyPageProps = {
  params: { slug: string };
};

export default async function CompliancePolicyDetailPage({ params }: PolicyPageProps) {
  await requireAdminUser(`/admin/compliance/policies/${params.slug}`);

  const policy = await loadMdx(['compliance/policies', params.slug]).catch(() => null);

  if (!policy) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin · Compliance</p>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/compliance"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
            >
              Back to compliance
            </Link>
            <Link
              href="/admin/compliance/policies"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
            >
              Back to policies
            </Link>
          </div>
        </div>
        <h1 className="text-3xl font-semibold text-slate-900">{policy.meta.title}</h1>
        <p className="text-sm text-slate-500">Last updated: {policy.meta.updated ?? '—'}</p>
      </header>

      <article className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {policy.content}
      </article>
    </main>
  );
}

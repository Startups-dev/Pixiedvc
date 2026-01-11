import { requireAdminUser } from '@/lib/admin';
import AdminMatchingClient from './AdminMatchingClient';

export default async function AdminMatchingPage() {
  await requireAdminUser('/admin/matching');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h1 className="text-3xl font-semibold text-slate-900">Matching command center</h1>
        <p className="text-sm text-slate-500">Filter and inspect current booking matches.</p>
      </div>

      <AdminMatchingClient />
    </div>
  );
}

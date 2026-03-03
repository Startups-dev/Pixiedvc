import { requireAdminUser } from '@/lib/admin';
import AdminMatchingClient from './AdminMatchingClient';
import AdminSubnav from '../AdminSubnav';

export default async function AdminMatchingPage() {
  await requireAdminUser('/admin/matching');

  return (
    <div className="min-h-screen bg-[#212121] px-6 py-12 text-[#ececec]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
          <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>Matching command center</h1>
          <p className="text-sm text-[#b4b4b4]">Filter and inspect current booking matches.</p>
          <AdminSubnav current="matching" />
        </div>

        <AdminMatchingClient />
      </div>
    </div>
  );
}

import { requireAdminUser } from '@/lib/admin';

import AdminSubnav from '../AdminSubnav';
import PlatformToolsClient from './PlatformToolsClient';

export default async function AdminPlatformToolsPage() {
  await requireAdminUser('/admin/platform-tools');
  const resetEnabled = process.env.ALLOW_ADMIN_RESET === 'true';

  return (
    <div className="min-h-screen bg-[#212121] px-6 py-12 text-[#ececec]">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
          <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
            Platform Tools
          </h1>
          <p className="text-sm text-[#b4b4b4]">
            Operational reset tools for staging and local test-data cleanup.
          </p>
          <AdminSubnav current="platform-tools" />
        </div>

        <PlatformToolsClient resetEnabled={resetEnabled} />
      </div>
    </div>
  );
}

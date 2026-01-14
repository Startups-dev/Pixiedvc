import { requireAdminUser } from '@/lib/admin';
import AdminLedgerClient from './AdminLedgerClient';
import AdminSubnav from '../../AdminSubnav';

export default async function AdminLedgerPage() {
  await requireAdminUser('/admin/reports/ledger');

  return (
    <div className="space-y-6">
      <AdminSubnav current="ledger" />
      <AdminLedgerClient />
    </div>
  );
}

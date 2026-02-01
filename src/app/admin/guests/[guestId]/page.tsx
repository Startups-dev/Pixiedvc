import Link from 'next/link';
import { requireAdminUser } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function AdminGuestProfilePage({
  params,
}: {
  params: { guestId: string };
}) {
  await requireAdminUser(`/admin/guests/${params.guestId}`);

  return (
    <div className="min-h-screen bg-[#0f1115] px-6 py-12 text-[#e6e8ec]">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/admin/guests" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9aa3b2] hover:text-[#e6e8ec]">
          ← Back to guests
        </Link>
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6b7280]">Admin</p>
          <h1 className="text-3xl font-semibold text-[#e6e8ec]">Guest profile</h1>
          <p className="text-[#9aa3b2]">Guest profile coming soon.</p>
        </header>
      </div>
    </div>
  );
}

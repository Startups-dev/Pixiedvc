import Link from 'next/link';

import PricingPromotionToggleClient from './PricingPromotionToggleClient';

import { requireAdminUser } from '@/lib/admin';

export default async function AdminPromotionsPage() {
  await requireAdminUser('/admin/promotions');

  return (
    <main className="min-h-screen bg-[#212121] text-[#ececec]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <a href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              Admin
            </a>
            <h1 className="mt-3 text-3xl font-semibold" style={{ color: '#64748b' }}>
              Promotions
            </h1>
            <p className="mt-2 text-sm text-[#b4b4b4]">
              Control new enrollments without affecting existing members.
            </p>
          </div>
          <a href="/admin" className="text-sm font-semibold text-[#10a37f] hover:underline">
            ← Back to admin
          </a>
        </div>

        <div className="mt-10">
          <PricingPromotionToggleClient name="Founders Launch" />
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Link
            href="/admin/promotions/guests"
            className="rounded-3xl border border-[#3a3a3a] bg-[#2f2f2f] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:bg-[#2a2a2a]"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Guests</p>
            <p className="mt-3 text-lg font-semibold" style={{ color: '#64748b' }}>
              Guest Promotions
            </p>
            <p className="mt-2 text-sm text-[#b4b4b4]">
              Manage Pixie Perks enrollment for new guest accounts.
            </p>
          </Link>
          <Link
            href="/admin/promotions/owners"
            className="rounded-3xl border border-[#3a3a3a] bg-[#2f2f2f] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:bg-[#2a2a2a]"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Owners</p>
            <p className="mt-3 text-lg font-semibold" style={{ color: '#64748b' }}>
              Owner Promotions
            </p>
            <p className="mt-2 text-sm text-[#b4b4b4]">
              Manage Pixie Preferred enrollment for new owner accounts.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}

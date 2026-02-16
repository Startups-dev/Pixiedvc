import Link from 'next/link';

import PricingPromotionToggleClient from './PricingPromotionToggleClient';

import { requireAdminUser } from '@/lib/admin';

export default async function AdminPromotionsPage() {
  await requireAdminUser('/admin/promotions');

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Promotions</h1>
          <p className="mt-2 text-sm text-slate-500">
            Control new enrollments without affecting existing members.
          </p>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Back to admin
        </Link>
      </div>

      <div className="mt-10">
        <PricingPromotionToggleClient name="Founders Launch" />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Link
          href="/admin/promotions/guests"
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Guests</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">Guest Promotions</p>
          <p className="mt-2 text-sm text-slate-500">
            Manage Pixie Perks enrollment for new guest accounts.
          </p>
        </Link>
        <Link
          href="/admin/promotions/owners"
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owners</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">Owner Promotions</p>
          <p className="mt-2 text-sm text-slate-500">
            Manage Pixie Preferred enrollment for new owner accounts.
          </p>
        </Link>
      </div>
    </div>
  );
}

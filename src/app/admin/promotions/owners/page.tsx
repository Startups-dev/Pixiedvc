import Link from 'next/link';

import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getPromotionsSetting } from '@/lib/promotions-settings';

import PromotionsToggleClient from '../PromotionsToggleClient';

export default async function AdminOwnerPromotionsPage() {
  await requireAdminUser('/admin/promotions/owners');

  const adminClient = getSupabaseAdminClient();
  const initialEnabled = adminClient
    ? await getPromotionsSetting('promotions_owner_enrollment_enabled')
    : { data: true, error: null };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin · Promotions</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Owner Promotions</h1>
          <p className="mt-2 text-sm text-slate-500">
            Turning OFF stops new enrollments. Existing members keep benefits.
          </p>
        </div>
        <Link href="/admin/promotions" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Back to promotions
        </Link>
      </div>

      <div className="mt-8">
        <PromotionsToggleClient
          label="Pixie Preferred enrollment"
          description="Turning OFF stops new enrollments. Existing members keep benefits."
          settingKey="promotions_owner_enrollment_enabled"
          initialEnabled={initialEnabled.data ?? true}
        />
      </div>
    </div>
  );
}

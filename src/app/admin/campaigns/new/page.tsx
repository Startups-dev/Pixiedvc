import Link from 'next/link';

import { Card } from '@pixiedvc/design-system';

import { CampaignEditorForm } from '@/app/admin/campaigns/CampaignEditorForm';
import { createCampaignDraftAction } from '@/app/admin/campaigns/actions';
import { requireAdminUser } from '@/lib/admin';
import { buildUnsubscribeUrl } from '@/lib/email-subscribers';
import { buildNewsletterCampaignPreview, getNewsletterCampaignEditorValues } from '@/lib/newsletter-campaigns';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export default async function NewCampaignPage() {
  await requireAdminUser('/admin/campaigns/new');
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-3">
            <Link href="/admin/campaigns" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to campaigns
            </Link>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
              <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
                New Campaign
              </h1>
            </div>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Missing service role key. Configure <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </Card>
        </div>
      </div>
    );
  }

  const initialValues = getNewsletterCampaignEditorValues();
  const preview = buildNewsletterCampaignPreview(initialValues, buildUnsubscribeUrl('preview-token'));

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
        <header className="space-y-3">
          <Link href="/admin/campaigns" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            ← Back to campaigns
          </Link>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
            <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
              New Campaign
            </h1>
            <p className="text-sm text-[#b4b4b4]">Create a newsletter campaign draft. Sending and scheduling come later.</p>
          </div>
        </header>

        <CampaignEditorForm
          mode="create"
          initialValues={initialValues}
          initialPreview={preview}
          action={createCampaignDraftAction}
        />
      </div>
    </div>
  );
}

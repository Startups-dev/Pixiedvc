import { ingestSubscriber } from '@/lib/email-subscribers';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

function splitFullName(fullName: string | null | undefined) {
  const value = fullName?.trim() ?? '';
  if (!value) {
    return { firstName: null, lastName: null };
  }

  const parts = value.split(/\s+/);
  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : null,
  };
}

export async function syncOwnerNewsletterSubscriber(params: {
  email: string;
  fullName?: string | null;
  userId?: string | null;
  country?: string | null;
  client?: AdminClient | null;
}) {
  const { firstName, lastName } = splitFullName(params.fullName ?? null);

  return ingestSubscriber({
    email: params.email,
    firstName,
    lastName,
    userId: params.userId ?? null,
    country: params.country ?? null,
    source: 'owner_onboarding',
    explicitConsent: true,
    emailPreferences: { marketing: true },
    tags: ['owner_lead'],
    metadata: {
      capture_point: 'owner_onboarding_opt_in',
    },
    client: params.client,
  });
}

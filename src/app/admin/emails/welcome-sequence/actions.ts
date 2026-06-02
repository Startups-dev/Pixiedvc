'use server';

import { redirect } from 'next/navigation';

import { requireAdminUser } from '@/lib/admin';
import { sendWelcomeSequenceTestEmail } from '@/lib/welcome-sequence-preview';

function buildRedirectUrl(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `/admin/emails/welcome-sequence?${search.toString()}`;
}

export async function sendWelcomeSequenceTestAction(formData: FormData) {
  const { user } = await requireAdminUser('/admin/emails/welcome-sequence');

  const email = String(formData.get('email') ?? '').trim();
  const stepValue = Number(formData.get('step'));

  if (!email || !Number.isFinite(stepValue)) {
    redirect(
      buildRedirectUrl({
        error: 'Missing test email or sequence step.',
      }),
    );
  }

  try {
    await sendWelcomeSequenceTestEmail({
      email,
      step: stepValue as 0 | 3 | 7 | 14 | 21 | 30,
      requestedByEmail: user.email ?? null,
    });

    redirect(
      buildRedirectUrl({
        sent: '1',
        step: String(stepValue),
        email,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'invalid_email'
        ? 'Enter a valid email address.'
        : error instanceof Error && error.message === 'service_role_missing'
          ? 'Missing SUPABASE_SERVICE_ROLE_KEY.'
          : 'Unable to send the test email right now.';

    redirect(
      buildRedirectUrl({
        error: message,
        email,
        step: String(stepValue),
      }),
    );
  }
}

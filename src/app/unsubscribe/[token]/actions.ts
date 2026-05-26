'use server';

import { unsubscribeByToken, updateSubscriberPreferencesByToken } from '@/lib/email-subscribers';

export type UnsubscribeActionState = {
  status: 'idle' | 'invalid' | 'unsubscribed' | 'already_unsubscribed' | 'preferences_updated' | 'error';
  message: string | null;
};

export async function submitUnsubscribeAction(
  _prevState: UnsubscribeActionState,
  formData: FormData,
): Promise<UnsubscribeActionState> {
  const token = String(formData.get('token') ?? '').trim();
  const intent = String(formData.get('intent') ?? '').trim();

  if (!token) {
    return {
      status: 'invalid',
      message: 'This unsubscribe link is invalid or expired.',
    };
  }

  try {
    if (intent === 'preferences') {
      const marketing = formData.get('marketing') === 'on';
      const result = await updateSubscriberPreferencesByToken({
        token,
        preferences: { marketing },
      });

      if (!result.ok) {
        return {
          status: 'invalid',
          message: 'This unsubscribe link is invalid or expired.',
        };
      }

      return {
        status: 'preferences_updated',
        message: 'We’ve updated your PixieDVC email preferences.',
      };
    }

    const result = await unsubscribeByToken(token);
    if (!result.ok) {
      return {
        status: 'invalid',
        message: 'This unsubscribe link is invalid or expired.',
      };
    }

    if (result.reason === 'already_unsubscribed') {
      return {
        status: 'already_unsubscribed',
        message: 'You’re already unsubscribed.',
      };
    }

    return {
      status: 'unsubscribed',
      message: 'We’ve updated your PixieDVC email preferences.',
    };
  } catch {
    return {
      status: 'error',
      message: 'We could not update your preferences right now. Please try again.',
    };
  }
}

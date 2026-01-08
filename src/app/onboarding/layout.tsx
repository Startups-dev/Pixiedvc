import type { ReactNode } from 'react';

import { requireOnboardingInProgress } from './guards';

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  await requireOnboardingInProgress();
  return <>{children}</>;
}

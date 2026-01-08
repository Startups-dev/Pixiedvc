import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('redirect');
  }),
}));

import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { ensureOnboardingNotComplete, requireOnboardingInProgress } from './guards';

const mockedRedirect = vi.mocked(redirect);
const mockedSupabaseServer = vi.mocked(supabaseServer);

function createSelectResult(result: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: result, error: null });
  const limit = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ maybeSingle, limit }));
  const select = vi.fn(() => ({ eq, maybeSingle, limit }));
  return { select };
}

function createSupabaseStub({
  profile = null,
  owner = null,
  membership = null,
  user = { id: 'owner-1' },
}: {
  profile?: unknown;
  owner?: unknown;
  membership?: unknown;
  user?: { id: string };
}) {
  const tableHandlers = {
    profiles: createSelectResult(profile),
    owners: createSelectResult(owner),
    owner_memberships: createSelectResult(membership),
  };

  const supabase = {
    from: vi.fn((table: string) => tableHandlers[table as keyof typeof tableHandlers]),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  };

  return supabase;
}

describe('onboarding guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('ensureOnboardingNotComplete throws when profile already completed', async () => {
    const stub = createSupabaseStub({ profile: { onboarding_completed: true } });
    await expect(ensureOnboardingNotComplete(stub, 'owner-1')).rejects.toThrow(
      'Onboarding has already been completed.',
    );
    expect(stub.from).toHaveBeenCalledWith('profiles');
  });

  test('requireOnboardingInProgress redirects when already completed', async () => {
    const stub = createSupabaseStub({
      profile: { onboarding_completed: true },
      owner: null,
      membership: null,
      user: { id: 'owner-1' },
    });
    mockedSupabaseServer.mockReturnValue(stub);
    const cookieStore = { set: vi.fn(), delete: vi.fn() } as any;

    await expect(requireOnboardingInProgress(cookieStore)).rejects.toThrow('redirect');
    expect(mockedRedirect).toHaveBeenCalledWith('/owner/dashboard');
    expect(cookieStore.set).toHaveBeenCalledWith('onboarding_completed_message', '1', {
      path: '/',
      maxAge: 60,
    });
  });

  test('requireOnboardingInProgress continues when not completed', async () => {
    const stub = createSupabaseStub({
      profile: { onboarding_completed: false, onboarding_completed_at: null },
      owner: null,
      membership: null,
      user: { id: 'owner-1' },
    });
    mockedSupabaseServer.mockReturnValue(stub);
    const cookieStore = { set: vi.fn(), delete: vi.fn() } as any;

    await expect(requireOnboardingInProgress(cookieStore)).resolves.toEqual({ id: 'owner-1' });
    expect(mockedRedirect).not.toHaveBeenCalled();
  });
});

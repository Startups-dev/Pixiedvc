import { beforeEach, describe, expect, test, vi } from 'vitest';

import { saveOwnerContracts } from './actions';

function createSelectChain(result: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: result, error: null });
  const limit = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ maybeSingle, limit }));
  const select = vi.fn(() => ({ eq, maybeSingle, limit }));
  return { select };
}

type SupabaseMock = {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
};

let supabaseMock: SupabaseMock;
let ownerUpsert: ReturnType<typeof vi.fn>;
let membershipsUpsert: ReturnType<typeof vi.fn>;

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: () => supabaseMock,
}));

describe('saveOwnerContracts', () => {
  beforeEach(() => {
    ownerUpsert = vi.fn().mockResolvedValue({ error: null });
    membershipsUpsert = vi.fn().mockResolvedValue({ error: null });

    const profileQuery = createSelectChain({ onboarding_completed: false, onboarding_completed_at: null });
    const ownerQuery = createSelectChain(null);
    const membershipQuery = createSelectChain(null);

    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'owner-1', user_metadata: {} } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'owners') {
          return { upsert: ownerUpsert, select: ownerQuery.select };
        }
        if (table === 'owner_memberships') {
          return { upsert: membershipsUpsert, select: membershipQuery.select };
        }
        if (table === 'profiles') {
          return profileQuery;
        }
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    };
  });

  test('upserts memberships without deleting existing rows', async () => {
    await saveOwnerContracts([
      {
        resort_id: 'resort-1',
        use_year: 'FEB',
        contract_year: 2023,
        points_owned: 100,
        points_available: 80,
      },
    ]);

    await saveOwnerContracts([
      {
        resort_id: 'resort-1',
        use_year: 'FEB',
        contract_year: 2023,
        points_owned: 120,
        points_available: 95,
      },
    ]);

    expect(membershipsUpsert).toHaveBeenCalledTimes(2);
    expect(membershipsUpsert.mock.calls[0][1]).toEqual({
      onConflict: 'owner_id,resort_id,use_year,contract_year',
    });
    expect(membershipsUpsert.mock.calls[1][0]).toEqual([
      {
        owner_id: 'owner-1',
        resort_id: 'resort-1',
        use_year: 'FEB',
        contract_year: 2023,
        points_owned: 120,
        points_available: 95,
      },
    ]);
  });
});

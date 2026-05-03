import Link from 'next/link';

import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type AuthUserRow = {
  id: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
  app_metadata?: {
    provider?: string | null;
    providers?: string[] | null;
  } | null;
  user_metadata?: {
    display_name?: string | null;
    full_name?: string | null;
    name?: string | null;
  } | null;
  identities?: Array<{
    provider?: string | null;
  }> | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  role: string | null;
  onboarding_completed: boolean | null;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

async function fetchAllAuthUsers() {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { users: null as AuthUserRow[] | null, error: 'Missing service-role client for auth user listing.' };
  }

  const perPage = 200;
  const pages: AuthUserRow[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return { users: null as AuthUserRow[] | null, error: error.message };
    }

    const batch = (data?.users ?? []) as AuthUserRow[];
    pages.push(...batch);

    if (batch.length < perPage) {
      break;
    }
  }

  return { users: pages, error: null as string | null };
}

function formatCreatedAt(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

function createdAtSortValue(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function normalizeProviderLabel(provider: string) {
  return provider === 'google'
    ? 'Google'
    : provider === 'facebook'
      ? 'Facebook'
      : provider === 'email'
        ? 'Email'
        : provider.charAt(0).toUpperCase() + provider.slice(1);
}

function getProviders(user: AuthUserRow) {
  const providers = new Set<string>();

  for (const provider of user.app_metadata?.providers ?? []) {
    if (provider) providers.add(provider);
  }

  if (user.app_metadata?.provider) {
    providers.add(user.app_metadata.provider);
  }

  for (const identity of user.identities ?? []) {
    if (identity.provider) providers.add(identity.provider);
  }

  if (!providers.size && user.email) {
    providers.add('email');
  }

  return Array.from(providers);
}

function getProviderType(providers: string[]) {
  const normalized = providers.filter(Boolean);
  if (!normalized.length) return '—';
  return normalized.some((provider) => provider !== 'email') ? 'Social' : 'Email';
}

export default async function AdminUsersPage() {
  await requireAdminUser('/admin/users');

  const { users, error } = await fetchAllAuthUsers();

  if (error || !users) {
    return (
      <div className="min-h-screen bg-[#212121] text-[#ececec]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
          <h1 className="mt-3 text-3xl font-semibold" style={{ color: '#64748b' }}>Users</h1>
          <div className="mt-6 rounded-2xl border border-[#3a3a3a] bg-[#2f2f2f] p-6">
            <p className="text-lg font-semibold text-[#ff6b6b]">Unable to load auth users</p>
            <p className="mt-2 text-sm text-[#b4b4b4]">{error ?? 'Unknown error.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const userIds = users.map((user) => user.id);
  const admin = getSupabaseAdminClient();
  const profileMap = new Map<string, ProfileRow>();

  if (admin && userIds.length) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name, full_name, role, onboarding_completed')
      .in('id', userIds);

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profileMap.set(profile.id, profile);
    }
  }

  const rows = users
    .map((user) => {
      const profile = profileMap.get(user.id);
      const providers = getProviders(user);
      const authDisplayName =
        user.user_metadata?.display_name ??
        user.user_metadata?.name ??
        user.user_metadata?.full_name ??
        null;
      const fullName = profile?.full_name ?? user.user_metadata?.full_name ?? null;

      return {
        id: user.id,
        displayName: authDisplayName ?? profile?.display_name ?? '—',
        fullName: fullName ?? '—',
        email: user.email ?? '—',
        phone: user.phone ?? '—',
        providers: providers.length ? providers.map(normalizeProviderLabel).join(', ') : '—',
        providerType: getProviderType(providers),
        role: profile?.role ?? '—',
        onboardingCompleted: profile?.onboarding_completed ? 'Yes' : 'No',
        createdAt: formatCreatedAt(user.created_at),
        createdAtSort: createdAtSortValue(user.created_at),
      };
    })
    .sort((a, b) => b.createdAtSort - a.createdAtSort);

  return (
    <div className="min-h-screen bg-[#212121] text-[#ececec]">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
          <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>Users</h1>
          <p className="text-[#b4b4b4]">
            Auth users with profile display name, full name, provider details, and onboarding status.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#8e8ea0]">
            <span>{rows.length} users loaded</span>
            <Link href="/admin" className="font-semibold text-[#10a37f] hover:text-[#0d8c6d]">
              Back to Control Center →
            </Link>
          </div>
        </header>

        <div className="overflow-x-auto rounded-2xl border border-[#3a3a3a] bg-[#2f2f2f] shadow-sm">
          <table className="min-w-full divide-y divide-[#3a3a3a] text-sm">
            <thead className="bg-[#212121] text-left text-xs font-semibold uppercase tracking-wide text-[#8e8ea0]">
              <tr>
                <th className="px-4 py-3">UID</th>
                <th className="px-4 py-3">Display name</th>
                <th className="px-4 py-3">Full name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Providers</th>
                <th className="px-4 py-3">Provider type</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Onboarding</th>
                <th className="px-4 py-3">Created at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3a3a3a]">
              {rows.map((row) => (
                <tr key={row.id} className="align-top text-[#b4b4b4]">
                  <td className="px-4 py-3 font-mono text-xs text-[#ececec]">{row.id}</td>
                  <td className="px-4 py-3 text-[#ececec]">{row.displayName}</td>
                  <td className="px-4 py-3 text-[#ececec]">{row.fullName}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{row.phone}</td>
                  <td className="px-4 py-3">{row.providers}</td>
                  <td className="px-4 py-3">{row.providerType}</td>
                  <td className="px-4 py-3">{row.role}</td>
                  <td className="px-4 py-3">{row.onboardingCompleted}</td>
                  <td className="px-4 py-3 text-xs text-[#8e8ea0]">{row.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

import { requireOwnerAccess } from "@/lib/owner/requireOwnerAccess";
import { getOwnerMemberships } from "@/lib/owner-data";

import { updateOwnerMembershipMatchingPreferences } from "./actions";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default async function OwnerMembershipPreferencesPage() {
  const { user } = await requireOwnerAccess("/owner/memberships");
  const memberships = await getOwnerMemberships(user.id);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Owner Settings</p>
        <h1 className="text-3xl font-semibold text-slate-900">Matching Preferences</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Update how each membership should be matched when Premium inventory is unavailable.
        </p>
      </header>

      <div>
        <Link href="/owner/dashboard" className="text-sm font-semibold text-[#0F2148] underline-offset-2 hover:underline">
          Back to dashboard
        </Link>
      </div>

      {memberships.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No owner memberships were found yet.
        </section>
      ) : (
        <section className="space-y-4">
          {memberships.map((membership) => {
            const currentMode = membership.matching_mode === "premium_then_standard" ? "premium_then_standard" : "premium_only";
            return (
              <form
                key={membership.id}
                action={updateOwnerMembershipMatchingPreferences}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <input type="hidden" name="membership_id" value={membership.id} />
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Membership</p>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {membership.resort?.name ?? "Resort TBD"}
                    </h2>
                    <p className="text-sm text-slate-600">
                      Use year: {membership.use_year ?? "—"} · Starts {formatDate(membership.use_year_start)}
                    </p>

                    <label className="mt-3 block">
                      <span className="text-sm font-semibold text-slate-700">Matching mode</span>
                      <select
                        name="matching_mode"
                        defaultValue={currentMode}
                        className="mt-1.5 h-11 w-full max-w-xl rounded-xl border border-slate-300 px-3 text-sm"
                      >
                        <option value="premium_only">Premium only</option>
                        <option value="premium_then_standard">Try Premium then Standard</option>
                      </select>
                    </label>
                    <p className="text-xs text-slate-500">
                      Premium only keeps strict matching. Try Premium then Standard allows fallback matching when needed.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0F2148] px-5 text-sm font-semibold text-white"
                  >
                    Save preferences
                  </button>
                </div>
              </form>
            );
          })}
        </section>
      )}
    </main>
  );
}

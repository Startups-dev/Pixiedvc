import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPromotionsSetting } from "@/lib/promotions-settings";
import { getOwnerPreferredBonusCents, getOwnerPreferredTier } from "@/lib/owner-rewards";

export const dynamic = "force-dynamic";

export default async function OwnerRewardsPage() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/rewards");
  }

  const adminClient = getSupabaseAdminClient();
  const client = adminClient ?? supabase;

  const { data: owner } = await client
    .from("owners")
    .select("id, user_id")
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  if (!owner) {
    redirect("/owner/dashboard");
  }
  const { data: profile } = await client
    .from("profiles")
    .select("id, owner_rewards_enrolled_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: enrollmentEnabled } = await getPromotionsSetting(
    "promotions_owner_enrollment_enabled",
  );
  const enrollmentFlag = enrollmentEnabled ?? true;

  const { data: stats } = await client
    .from("owner_rewards_stats")
    .select("owner_id, lifetime_points_rented, tier")
    .eq("owner_id", owner.id)
    .maybeSingle();

  const lifetimePoints = Number(stats?.lifetime_points_rented ?? 0);
  const tier = getOwnerPreferredTier(lifetimePoints);
  const bonusCents = getOwnerPreferredBonusCents(lifetimePoints);
  const enrolled = Boolean(profile?.owner_rewards_enrolled_at);

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-12">
      <header className="rounded-3xl bg-[#0B1B3A] px-8 py-10 text-white shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Pixie Preferred™</p>
        <h1 className="mt-3 text-3xl font-semibold text-white !text-white">Owner rewards</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Pixie Preferred recognizes consistent owners with higher per‑point earnings as stays complete.
          Enrollment may close for new participants; existing members keep benefits.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Your current status</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {enrolled ? "Enrolled" : enrollmentFlag ? "Not enrolled yet" : "Enrollment closed"}
            </p>
            <p className="mt-1 text-sm text-slate-500">Lifetime points: {lifetimePoints}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current bonus</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              +${(bonusCents / 100).toFixed(2)}/pt
            </p>
            <p className="text-xs text-slate-500">Tier: {tier}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">How bonuses grow</h2>
        <ul className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <li>0–299 points: +$0.00</li>
          <li>300–599 points: +$0.50</li>
          <li>600–999 points: +$1.00</li>
          <li>1000–1499 points: +$1.50</li>
          <li>1500+ points: +$2.00</li>
        </ul>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">How we prioritize</h2>
        <p className="text-sm text-slate-600">
          We balance speed and consistency across owners. Reward tiers are honored without
          compromising guest fit or inventory quality.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <strong>Does this change guest pricing?</strong> No. Pixie Preferred increases owner
            earnings only.
          </p>
          <p>
            <strong>What if enrollment closes?</strong> Enrollment may close for new participants;
            existing members keep benefits.
          </p>
        </div>
      </section>

      <div>
        <Link href="/owner/dashboard" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}

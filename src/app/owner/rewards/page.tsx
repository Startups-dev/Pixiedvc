import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import OwnerPageHeader from "@/components/owner/shared/OwnerPageHeader";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPromotionsSetting } from "@/lib/promotions-settings";
import { getOwnerPreferredBonusCents, getOwnerPreferredTier } from "@/lib/owner-rewards";
import { buildOwnerRewardSummary } from "@/lib/owner/secondary-subpages";

export const dynamic = "force-dynamic";

export default async function OwnerRewardsPage() {
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

  const { data: enrollmentEnabled } = await getPromotionsSetting("promotions_owner_enrollment_enabled");
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
  const rewardSummary = buildOwnerRewardSummary({
    enrolled,
    enrollmentEnabled: enrollmentFlag,
    lifetimePoints,
    tier,
    bonusCents,
  });

  return (
    <div className="space-y-8">
      <OwnerPageHeader
        eyebrow="Owner rewards"
        title="Pixie Preferred rewards"
        description="Review owner reward status and bonus eligibility without treating rewards as released earnings."
        summary={rewardSummary.statusLabel}
      />

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Current status", value: rewardSummary.statusLabel, helper: "Program enrollment state" },
          { label: "Lifetime points", value: rewardSummary.lifetimePointsLabel, helper: "Completed owner activity" },
          { label: "Current bonus", value: rewardSummary.bonusLabel, helper: `Tier: ${rewardSummary.tierLabel}` },
        ].map((metric) => (
          <Card key={metric.label} className="rounded-[18px] border border-[#E7E7E4] bg-white p-5 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7A8495]">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[#10224A]">{metric.value}</p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">{metric.helper}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
          <h2 className="text-xl font-semibold text-[#10224A]">How bonuses grow</h2>
          <ul className="mt-5 grid gap-3 text-sm text-[#667085] sm:grid-cols-2">
            <li>0-299 points: +$0.00</li>
            <li>300-599 points: +$0.50</li>
            <li>600-999 points: +$1.00</li>
            <li>1000-1499 points: +$1.50</li>
            <li>1500+ points: +$2.00</li>
          </ul>
        </Card>

        <Card className="rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
          <h2 className="text-xl font-semibold text-[#10224A]">Program notes</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[#667085]">
            <p>Reward tiers are honored without compromising guest fit or inventory quality.</p>
            <p>Pixie Preferred can increase owner earnings only; it does not change guest pricing.</p>
            <p>Enrollment may close for new participants, while existing enrolled owners keep benefits.</p>
          </div>
          <Link href="/owner/dashboard" className="mt-5 inline-flex text-sm font-semibold text-[#10224A] underline-offset-4 hover:underline">
            Return to overview
          </Link>
        </Card>
      </section>
    </div>
  );
}

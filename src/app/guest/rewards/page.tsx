import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getGuestPerksDiscountPct } from "@/lib/guest-rewards";
import { getPromotionsSetting } from "@/lib/promotions-settings";
import { getActivePromotion } from "@/lib/pricing-promotions";
import GuestEnrollButton from "@/components/rewards/GuestEnrollButton";

export const dynamic = "force-dynamic";

export default async function GuestRewardsPage() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/guest/rewards");
  }

  const adminClient = getSupabaseAdminClient();
  const client = adminClient ?? supabase;

  const { data: profile } = await client
    .from("profiles")
    .select("id, guest_rewards_enrolled_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: enrollmentEnabled } = await getPromotionsSetting(
    "promotions_guest_enrollment_enabled",
  );
  const enrollmentFlag = enrollmentEnabled ?? true;
  const { data: activePromotion } = await getActivePromotion({ adminClient: client });
  const promotionActive = Boolean(activePromotion);

  const { data: rentals } = await client
    .from("rentals")
    .select("id")
    .eq("guest_user_id", user.id);
  const rentalIds = (rentals ?? []).map((row) => row.id).filter(Boolean);

  let completedCount = 0;
  if (rentalIds.length > 0) {
    const { count } = await client
      .from("rental_milestones")
      .select("rental_id", { count: "exact", head: true })
      .eq("code", "check_out")
      .eq("status", "completed")
      .in("rental_id", rentalIds);
    completedCount = count ?? 0;
  }

  const enrolled = Boolean(profile?.guest_rewards_enrolled_at);
  const discountPct = getGuestPerksDiscountPct(completedCount);

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-12">
      <header className="rounded-3xl bg-[#0B1B3A] px-8 py-10 text-white shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Pixie Perks™</p>
        <h1 className="mt-3 text-3xl font-semibold text-white !text-white">Guest rewards</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Pixie Perks rewards loyal guests with lower PixieDVC service fees as you complete stays.
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
            <p className="mt-1 text-sm text-slate-500">
              Completed stays: {completedCount}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current perk</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{discountPct}%</p>
            <p className="text-xs text-slate-500">Pixie fee discount</p>
          </div>
        </div>
        {promotionActive && !enrolled ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">
              Founders Launch is live — enroll to lock in up to $2 per point savings.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Enrollment may close at any time; existing members keep benefits.
            </p>
            <div className="mt-3">
              <GuestEnrollButton />
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">How discounts grow</h2>
        <ul className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <li>Stay 1: 0% discount</li>
          <li>Stay 2: 10% discount</li>
          <li>Stay 3: 20% discount</li>
          <li>Stay 4: 30% discount</li>
          <li>Stay 5+: 40% discount</li>
        </ul>
        <p className="text-xs text-slate-500">
          Discounts apply only to PixieDVC’s service fee. Owner payouts stay the same.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">What you unlock next</h2>
        <p className="text-sm text-slate-600">
          Complete more stays to reach the next discount tier. We’ll always show your current
          tier and the discount applied to your PixieDVC fee.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <strong>Does this change owner payouts?</strong> No. Pixie Perks only reduces the
            PixieDVC service fee.
          </p>
          <p>
            <strong>What if enrollment closes?</strong> Enrollment may close for new participants;
            existing members keep benefits.
          </p>
        </div>
      </section>

      <div>
        <Link href="/guest" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Back to requests
        </Link>
      </div>
    </div>
  );
}

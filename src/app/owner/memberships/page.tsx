import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import OwnerEmptyState from "@/components/owner/shared/OwnerEmptyState";
import OwnerPageHeader from "@/components/owner/shared/OwnerPageHeader";
import { requireOwnerAccess } from "@/lib/owner/requireOwnerAccess";
import { getOwnerMemberships } from "@/lib/owner-data";
import { buildOwnerMembershipListItems } from "@/lib/owner/secondary-subpages";
import { getMembershipNudge } from "@/lib/owner-nudges";

import { updateOwnerMembershipMatchingPreferences } from "./actions";

export default async function OwnerMembershipPreferencesPage() {
  const { user } = await requireOwnerAccess("/owner/memberships");
  const memberships = await getOwnerMemberships(user.id);
  const membershipItems = buildOwnerMembershipListItems(memberships);

  return (
    <div className="space-y-8">
      <OwnerPageHeader
        eyebrow="Owner account"
        title="Memberships and points"
        description="Manage each DVC membership and choose how it should be matched when Premium inventory is unavailable."
        summary={`${membershipItems.length} membership${membershipItems.length === 1 ? "" : "s"}`}
      />

      {memberships.length === 0 ? (
        <OwnerEmptyState
          title="No memberships added yet."
          body="Add membership details through owner onboarding so HannaDVC can match your points safely."
          action={
            <Link href="/owner/onboarding" className="text-sm font-semibold text-[#10224A] underline-offset-4 hover:underline">
              Continue owner onboarding
            </Link>
          }
        />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2" aria-label="Owner memberships">
          {memberships.map((membership) => {
            const item = membershipItems.find((entry) => entry.id === membership.id);
            const currentMode = membership.matching_mode === "premium_then_standard" ? "premium_then_standard" : "premium_only";
            const nudge = getMembershipNudge(membership);
            const pointStatus = membership.banked_assumed_at
              ? {
                  label: "Banked",
                  body: "HannaDVC is treating these points as banked for matching purposes based on owner confirmation.",
                }
              : membership.expired_assumed_at
                ? {
                    label: "Expired",
                    body: "HannaDVC is treating these points as expired for matching purposes based on owner confirmation.",
                  }
                : nudge?.stage === "banking"
                  ? {
                      label: "Banking deadline approaching",
                      body: "If these points have been banked, use the owner notification action so matching stays accurate.",
                    }
                  : nudge?.stage === "expiration"
                    ? {
                        label: "Expiring soon",
                        body: "Review the related notification when it appears so HannaDVC can confirm whether these points remain available.",
                      }
                    : null;
            return (
              <form
                key={membership.id}
                action={updateOwnerMembershipMatchingPreferences}
                className="rounded-[18px] border border-[#E7E7E4] bg-white p-5 shadow-[0_1px_2px_rgba(16,34,74,0.04)]"
              >
                <input type="hidden" name="membership_id" value={membership.id} />
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A8495]">Membership</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#10224A]">{item?.resortLabel ?? "Resort unavailable"}</h2>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.16em] text-[#7A8495]">Use year</dt>
                        <dd className="mt-1 text-[#667085]">{item?.useYearLabel}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.16em] text-[#7A8495]">Expiration</dt>
                        <dd className="mt-1 text-[#667085]">{item?.expiringPointsLabel}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.16em] text-[#7A8495]">Total points</dt>
                        <dd className="mt-1 font-semibold text-[#10224A]">{item?.totalPointsLabel}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.16em] text-[#7A8495]">Available points</dt>
                        <dd className="mt-1 font-semibold text-[#10224A]">{item?.availablePointsLabel}</dd>
                      </div>
                    </dl>
                  </div>

                  {pointStatus ? (
                    <div className="rounded-[14px] border border-[#ECECE8] bg-white p-4">
                      <p className="text-sm font-semibold text-[#10224A]">{pointStatus.label}</p>
                      <p className="mt-1 text-xs leading-5 text-[#667085]">{pointStatus.body}</p>
                    </div>
                  ) : null}

                  <Card className="rounded-[14px] border border-[#ECECE8] bg-white p-4">
                    <label className="block">
                      <span className="text-sm font-semibold text-[#10224A]">Matching mode</span>
                      <select
                        name="matching_mode"
                        defaultValue={currentMode}
                        className="mt-2 h-11 w-full rounded-xl border border-[#E7E7E4] bg-white px-3 text-sm text-[#10224A]"
                      >
                        <option value="premium_only">Premium only</option>
                        <option value="premium_then_standard">Try Premium then Standard</option>
                      </select>
                    </label>
                    <p className="mt-2 text-xs leading-5 text-[#667085]">
                      Current preference: {item?.matchingModeLabel}. Premium only keeps strict matching; Standard fallback can broaden matching when needed.
                    </p>
                  </Card>

                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#10224A] px-5 text-sm font-semibold text-white"
                  >
                    Save preferences
                  </button>
                </div>
              </form>
            );
          })}
        </section>
      )}
    </div>
  );
}

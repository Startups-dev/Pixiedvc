import { redirect } from "next/navigation";

import { getAffiliateForUser } from "@/lib/affiliates";
import AffiliateResourcesClient from "@/app/affiliate/resources/AffiliateResourcesClient";
import { requireAffiliateUser } from "@/lib/role-guards";
import { getReferralBaseUrl } from "@/lib/affiliate-referrals";

export default async function AffiliateResourcesPage() {
  const { user } = await requireAffiliateUser("/affiliate/resources");

  const affiliate = await getAffiliateForUser(user.id, user.email);
  if (!affiliate) {
    redirect("/affiliate/dashboard");
  }

  const baseUrl = getReferralBaseUrl();

  return (
    <AffiliateResourcesClient
      affiliate={{
        displayName: affiliate.displayName,
        slug: affiliate.slug ?? "",
        tier: affiliate.tier,
        commissionRate: affiliate.commissionRate,
      }}
      baseUrl={baseUrl}
    />
  );
}

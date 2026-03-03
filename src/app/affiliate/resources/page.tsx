import { redirect } from "next/navigation";

import { getAffiliateForUser } from "@/lib/affiliates";
import AffiliateResourcesClient from "@/app/affiliate/resources/AffiliateResourcesClient";
import { requireAffiliateUser } from "@/lib/role-guards";

export default async function AffiliateResourcesPage() {
  const { user } = await requireAffiliateUser("/affiliate/resources");

  const affiliate = await getAffiliateForUser(user.id, user.email);
  if (!affiliate) {
    redirect("/affiliate/dashboard");
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

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

import { Suspense } from "react";
import { redirect } from "next/navigation";
import AffiliateGuidesClient from "./AffiliateGuidesClient";
import { requireAffiliateUser } from "@/lib/role-guards";
import { getAffiliateForUser } from "@/lib/affiliates";

export default async function AffiliateGuidesPage() {
  const { user } = await requireAffiliateUser("/affiliate/guides");
  const affiliate = await getAffiliateForUser(user.id, user.email);
  if (!affiliate) {
    redirect("/affiliate/dashboard");
  }

  return (
    <Suspense fallback={null}>
      <AffiliateGuidesClient initialAffiliateSlug={affiliate.slug ?? ""} />
    </Suspense>
  );
}

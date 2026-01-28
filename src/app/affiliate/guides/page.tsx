import { Suspense } from "react";
import AffiliateGuidesClient from "./AffiliateGuidesClient";

export default function AffiliateGuidesPage() {
  return (
    <Suspense fallback={null}>
      <AffiliateGuidesClient />
    </Suspense>
  );
}

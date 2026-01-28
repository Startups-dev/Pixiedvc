import { Suspense } from "react";
import AffiliateLoginClient from "./AffiliateLoginClient";

export default function AffiliateLoginPage() {
  return (
    <Suspense fallback={null}>
      <AffiliateLoginClient />
    </Suspense>
  );
}

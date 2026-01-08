"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function RecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname === "/login" && searchParams.get("mode") === "update") return;

    const hash = window.location.hash || "";
    if (!hash) return;

    const hasRecoveryToken = hash.includes("type=recovery") || hash.includes("access_token=");
    if (!hasRecoveryToken) return;

    router.replace(`/login?mode=update${hash}`);
  }, [pathname, router, searchParams]);

  return null;
}

"use client";

import { usePathname } from "next/navigation";

import SiteFooter from "@/components/SiteFooter";

export default function SiteFooterClient() {
  const pathname = usePathname();

  if (
    pathname?.startsWith("/affiliate") ||
    pathname === "/owner" ||
    pathname?.startsWith("/owner/") ||
    pathname?.startsWith("/my-trip")
  ) {
    return null;
  }

  return <SiteFooter />;
}

"use client";

import { usePathname } from "next/navigation";

import SiteFooter from "@/components/SiteFooter";

export default function SiteFooterClient() {
  const pathname = usePathname();

  if (pathname?.startsWith("/affiliate")) {
    return null;
  }

  return <SiteFooter />;
}

"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import SiteFooterClient from "@/components/layout/SiteFooterClient";
import IntercomProvider from "@/components/chat/IntercomProvider";
import SupportWidget from "@/components/support/SupportWidget";

export default function SiteShell({ children, header }: { children: ReactNode; header: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname?.startsWith("/admin/");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex min-h-screen flex-col">
        {header}
        <main className="flex-1">{children}</main>
        <SiteFooterClient />
      </div>
      <IntercomProvider />
      <SupportWidget />
    </>
  );
}

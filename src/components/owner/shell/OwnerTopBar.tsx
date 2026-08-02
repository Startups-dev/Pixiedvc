"use client";

import Link from "next/link";
import { Bell, LifeBuoy } from "lucide-react";
import { usePathname } from "next/navigation";

import OwnerAccountMenu from "@/components/owner/shell/OwnerAccountMenu";
import OwnerMobileNav from "@/components/owner/shell/OwnerMobileNav";
import { getOwnerPageTitle } from "@/components/owner/shell/owner-navigation";

export default function OwnerTopBar() {
  const pathname = usePathname();
  const title = getOwnerPageTitle(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E3DA] bg-[#FAFAF8]/94 backdrop-blur supports-[backdrop-filter]:bg-[#FAFAF8]/82">
      <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <OwnerMobileNav />
          <div className="min-w-0">
            <p className="hidden text-[11px] uppercase tracking-[0.24em] text-[#8C7E67] sm:block">
              HannaDVC owner workspace
            </p>
            <h1 className="truncate text-xl font-semibold tracking-[-0.01em] text-[#10224A] sm:text-2xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/support"
            className="hidden min-h-10 items-center gap-2 rounded-full border border-[#E7E3DA] bg-white px-3 text-sm font-medium text-[#10224A] shadow-[0_8px_22px_rgba(16,34,74,0.06)] outline-none transition hover:border-[#d9d2c5] focus-visible:ring-2 focus-visible:ring-[#D8B451] focus-visible:ring-offset-2 sm:inline-flex"
          >
            <LifeBuoy className="h-4 w-4 text-[#B68A2E]" aria-hidden="true" />
            Support
          </Link>
          <Link
            href="/owner/notifications"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[#E7E3DA] bg-white text-[#10224A] shadow-[0_8px_22px_rgba(16,34,74,0.06)] outline-none transition hover:border-[#d9d2c5] focus-visible:ring-2 focus-visible:ring-[#D8B451] focus-visible:ring-offset-2"
            aria-label="Owner notifications"
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>
          <OwnerAccountMenu />
        </div>
      </div>
    </header>
  );
}

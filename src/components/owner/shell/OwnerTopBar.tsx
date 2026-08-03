"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import OwnerAccountMenu from "@/components/owner/shell/OwnerAccountMenu";
import OwnerMobileNav from "@/components/owner/shell/OwnerMobileNav";

export default function OwnerTopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E3DA] bg-white/92 backdrop-blur supports-[backdrop-filter]:bg-white/82">
      <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <OwnerMobileNav />
          <span className="sr-only">Owner dashboard navigation</span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/owner/notifications"
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border border-[#E7E3DA] bg-white text-[#0F1B33] shadow-[0_10px_25px_rgba(15,27,51,0.055)] outline-none transition hover:border-[#D4AF37]/45 focus-visible:ring-2 focus-visible:ring-[#D8B451] focus-visible:ring-offset-2"
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

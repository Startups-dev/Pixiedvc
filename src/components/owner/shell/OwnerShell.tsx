import type { ReactNode } from "react";

import OwnerSidebar from "@/components/owner/shell/OwnerSidebar";
import OwnerStatusBadge from "@/components/owner/shell/OwnerStatusBadge";
import OwnerTopBar from "@/components/owner/shell/OwnerTopBar";

export default function OwnerShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#10224A]">
      <a
        href="#owner-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#10224A] focus:shadow-lg focus:ring-2 focus:ring-[#D8B451]"
      >
        Skip to owner content
      </a>
      <div className="flex min-h-screen">
        <OwnerSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <OwnerTopBar />
          <main id="owner-main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
            <div className="mx-auto w-full max-w-[1240px] px-0 py-0">
              {children}
            </div>
          </main>
          <div className="border-t border-[#E7E3DA] px-4 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 text-xs text-[#7E8798] sm:flex-row sm:items-center sm:justify-between">
              <OwnerStatusBadge />
              <p>HannaDVC owner tools are protected by your existing account access.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

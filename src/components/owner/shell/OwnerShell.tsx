import type { ReactNode } from "react";

import OwnerSidebar from "@/components/owner/shell/OwnerSidebar";
import OwnerTopBar from "@/components/owner/shell/OwnerTopBar";
import { loadOwnerShellIdentity } from "@/lib/owner/identity";

export default async function OwnerShell({ children }: { children: ReactNode }) {
  const identity = await loadOwnerShellIdentity();

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
          <OwnerTopBar identity={identity} />
          <main id="owner-main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
            <div className="mx-auto w-full max-w-[1240px] px-0 py-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

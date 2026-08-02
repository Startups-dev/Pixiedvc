import Link from "next/link";

import OwnerNavigation from "@/components/owner/shell/OwnerNavigation";

export default function OwnerSidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 bg-[#10224A] text-white lg:flex lg:min-h-screen lg:flex-col">
      <div className="flex h-full flex-col px-5 py-6">
        <Link
          href="/owner/dashboard"
          className="rounded-[14px] px-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#E5C05A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10224A]"
          aria-label="HannaDVC owner overview"
        >
          <span className="block font-serif text-[21px] tracking-[0.18em] text-white">
            HANNA<span className="text-[#E5C05A]">DVC</span>
          </span>
          <span className="mt-1 block text-[11px] uppercase tracking-[0.24em] text-white/45">
            Owner Portal
          </span>
        </Link>

        <div className="mt-8 space-y-7">
          <div>
            <p className="mb-3 px-3 text-[11px] uppercase tracking-[0.24em] text-white/38">
              Workspace
            </p>
            <OwnerNavigation section="primary" />
          </div>

          <div className="h-px bg-white/10" />

          <div>
            <p className="mb-3 px-3 text-[11px] uppercase tracking-[0.24em] text-white/38">
              Owner Care
            </p>
            <OwnerNavigation section="secondary" />
          </div>
        </div>

        <div className="mt-auto rounded-[18px] border border-white/10 bg-white/[0.055] p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#E5C05A]">Support</p>
          <p className="mt-2 text-sm leading-5 text-white/70">
            Concierge help is available when a reservation or payout needs attention.
          </p>
          <Link
            href="/support"
            className="mt-4 inline-flex min-h-9 items-center rounded-full border border-white/16 px-3 text-xs font-semibold text-white/86 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#E5C05A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10224A]"
          >
            Contact support
          </Link>
        </div>
      </div>
    </aside>
  );
}

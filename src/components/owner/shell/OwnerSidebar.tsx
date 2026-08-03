import Link from "next/link";

import OwnerNavigation from "@/components/owner/shell/OwnerNavigation";

export default function OwnerSidebar() {
  return (
    <aside className="hidden w-[232px] shrink-0 bg-[#0F1B33] text-white lg:flex lg:min-h-screen lg:flex-col">
      <div className="flex h-full flex-col px-4 py-7">
        <Link
          href="/owner/dashboard"
          className="rounded-[14px] px-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#E5C05A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1B33]"
          aria-label="HannaDVC owner overview"
        >
          <span className="block font-serif text-[21px] tracking-[0.12em] text-white">
            HANNA<span className="text-[#E5C05A]">DVC</span>
          </span>
          <span className="mt-1 block text-[11px] uppercase tracking-[0.24em] text-white/45">
            Owner Portal
          </span>
        </Link>

        <div className="mt-8 space-y-6">
          <div>
            <p className="mb-3 px-3 text-[11px] uppercase tracking-[0.24em] text-white/38">
              Overview
            </p>
            <OwnerNavigation section="primary" />
          </div>

          <div className="h-px bg-white/10" />

          <div>
            <p className="mb-3 px-3 text-[11px] uppercase tracking-[0.24em] text-white/38">
              Account
            </p>
            <OwnerNavigation section="secondary" />
          </div>
        </div>

        <div className="mt-auto rounded-[14px] border border-white/10 bg-white/[0.055] p-4">
          <p className="text-sm font-semibold text-white">Need help?</p>
          <p className="mt-1 text-[13px] leading-5 text-white/68">
            Our team is here for you.
          </p>
          <Link
            href="/support"
            className="mt-4 inline-flex min-h-10 items-center rounded-[10px] border border-[#D4AF37]/45 px-3 text-xs font-semibold text-[#D4AF37] outline-none transition hover:bg-white/10 hover:text-[#F4D57A] focus-visible:ring-2 focus-visible:ring-[#E5C05A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1B33]"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </aside>
  );
}

import Link from "next/link";

import GuestTripSwitcher, {
  type GuestTripSwitcherItem,
} from "@/components/guest/shell/GuestTripSwitcher";

export default function GuestTopBar({
  currentTripId,
  trips,
}: {
  currentTripId: string;
  trips: GuestTripSwitcherItem[];
}) {
  return (
    <nav
      aria-label="Guest trip navigation"
      className="relative z-50 border-b border-[#10224A]/10 bg-[#FBFAF7]/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-6 py-3 sm:px-10 lg:px-14 xl:px-20">
        <Link
          href="/my-trip"
          className="font-serif text-lg tracking-[0.16em] text-[#10224A] transition hover:text-[#10224A]/72 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C49A3A]"
        >
          HANNA<span className="text-[#B88418]">DVC</span>
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-4 text-sm text-[#10224A]/58">
          <Link
            href="/hara"
            prefetch={false}
            className="transition hover:text-[#10224A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C49A3A]"
          >
            Plan with Hara
          </Link>
          <Link
            href="/support"
            className="transition hover:text-[#10224A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C49A3A]"
          >
            Support
          </Link>
          <GuestTripSwitcher currentTripId={currentTripId} trips={trips} />
        </div>
      </div>
    </nav>
  );
}

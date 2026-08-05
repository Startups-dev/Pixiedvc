import Link from "next/link";

export type GuestTripSwitcherItem = {
  id: string;
  resortName: string;
  dateRangeLabel: string | null;
  href: string;
};

export default function GuestTripSwitcher({
  currentTripId,
  trips,
}: {
  currentTripId: string;
  trips: GuestTripSwitcherItem[];
}) {
  if (trips.length <= 1) return null;

  const current = trips.find((trip) => trip.id === currentTripId) ?? trips[0];

  return (
    <details className="group relative z-50">
      <summary className="flex cursor-pointer list-none items-center gap-2 border-l border-[#10224A]/16 pl-4 text-sm text-[#10224A] transition hover:text-[#10224A]/72 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C49A3A]">
        <span className="text-xs font-medium text-[#10224A]/46">See your trips</span>
        <span className="max-w-[180px] truncate font-semibold">{current.resortName}</span>
        <span aria-hidden="true" className="text-[0.7rem] leading-none text-[#C49A3A] transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="absolute right-0 z-[70] mt-3 w-[min(340px,calc(100vw-2rem))] border border-[#10224A]/12 bg-white p-2 shadow-[0_24px_70px_rgba(16,34,74,0.16)] motion-safe:animate-[guest-menu-in_160ms_ease-out_both]">
        <p className="px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#A77A12]">
          Your trips
        </p>
        <div className="space-y-1">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={trip.href}
              aria-current={trip.id === currentTripId ? "page" : undefined}
              className="block px-3 py-2 text-sm text-[#10224A] transition hover:bg-[#F8F5EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A3A]"
            >
              <span className="block font-semibold">{trip.resortName}</span>
              {trip.dateRangeLabel ? (
                <span className="mt-0.5 block text-xs text-[#10224A]/58">{trip.dateRangeLabel}</span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </details>
  );
}

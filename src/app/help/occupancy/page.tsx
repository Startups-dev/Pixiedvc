import Link from "next/link";

export default function OccupancyHelpPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 text-[#0F2148]">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-[#0F2148]/60">Help Center</p>
        <h1 className="mt-3 font-display text-3xl text-[#0F2148]">How room occupancy works</h1>
        <p className="mt-4 text-base text-[#0F2148]/70">
          Disney resorts enforce maximum occupancy limits for each villa type. These limits are set by Disney and apply
          to every reservation, including infants.
        </p>
      </div>

      <div className="mt-8 space-y-6 text-[#0F2148]/80">
        <div>
          <h2 className="text-lg font-semibold text-[#0F2148]">All guests count</h2>
          <p className="mt-2">
            Adults, children, and infants all count toward room occupancy. This is why we ask for total party size
            early in the process.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#0F2148]">Occupancy varies by villa type</h2>
          <p className="mt-2">
            Studios, one-bedroom, two-bedroom, and grand villas each have different capacity limits. PixieDVC uses
            Disney’s published maximums to keep your stay compliant and comfortable.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#0F2148]">Resort-specific nuances</h2>
          <p className="mt-2">
            Some resorts or room categories may have slightly different limits. If your party is close to the maximum,
            our concierge team will confirm the best fit.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <Link
          href="/calculator"
          className="inline-flex items-center justify-center rounded-full bg-[#0F2148] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1a2b5e]"
        >
          Back to calculator
        </Link>
      </div>
    </div>
  );
}

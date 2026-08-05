import type { GuestTripHeroViewModel } from "@/lib/guest/hero-view-model";

export default function GuestCountdown({
  countdown,
}: {
  countdown: GuestTripHeroViewModel["countdown"];
}) {
  if (!countdown) return null;

  return (
    <div aria-label={countdown.accessibleLabel} className="min-w-[10rem] border-l border-[#C49A3A]/45 pl-5">
      <p className="text-3xl font-semibold leading-none text-[#10224A] sm:text-4xl">
        {countdown.value}
      </p>
      <p className="mt-2 text-sm leading-5 text-[#10224A]/58">
        {countdown.context}
      </p>
    </div>
  );
}

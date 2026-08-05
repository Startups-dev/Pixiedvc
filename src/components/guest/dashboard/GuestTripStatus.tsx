export default function GuestTripStatus({ label }: { label: string }) {
  return (
    <p className="inline-flex items-center gap-2 text-sm font-medium text-[#10224A]/76">
      <span className="h-1.5 w-1.5 rounded-full bg-[#C49A3A]" aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}

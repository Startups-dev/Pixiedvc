type OwnerStatusBadgeProps = {
  label?: string;
};

export default function OwnerStatusBadge({ label = "Owner workspace" }: OwnerStatusBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#E7E3DA] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8C6A1F]">
      {label}
    </span>
  );
}

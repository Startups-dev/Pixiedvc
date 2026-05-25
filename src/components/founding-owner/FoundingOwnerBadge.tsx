type FoundingOwnerBadgeProps = {
  showBonusText?: boolean;
  className?: string;
};

export default function FoundingOwnerBadge({
  showBonusText = false,
  className = "",
}: FoundingOwnerBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-[#d8c48a] bg-[#f7f0da] px-3 py-1 text-xs font-semibold tracking-[0.14em] text-[#17325c] ${className}`.trim()}
    >
      <span className="h-2 w-2 rounded-full bg-[#c59c2f]" aria-hidden="true" />
      <span>Founding Owner</span>
      {showBonusText ? <span className="tracking-normal text-[#6d5b28]">+$2/pt bonus active</span> : null}
    </span>
  );
}

type OwnerRecordStatusBadgeProps = {
  label: string;
  tone?: "neutral" | "attention" | "success" | "issue";
};

export default function OwnerRecordStatusBadge({ label, tone = "neutral" }: OwnerRecordStatusBadgeProps) {
  const toneClass =
    tone === "attention"
      ? "border-[#E8D6A8] text-[#8B6B2E]"
      : tone === "success"
        ? "border-[#D7E8DD] text-[#356B45]"
        : tone === "issue"
          ? "border-[#E8D7D7] text-[#8A3B3B]"
          : "border-[#E7E7E4] text-[#667085]";

  return (
    <span className={`inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {label}
    </span>
  );
}

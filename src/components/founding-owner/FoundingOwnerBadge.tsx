import Image from "next/image";

type FoundingOwnerBadgeProps = {
  showBonusText?: boolean;
  className?: string;
  variant?: "pill" | "artwork";
};

export default function FoundingOwnerBadge({
  showBonusText = false,
  className = "",
  variant = "pill",
}: FoundingOwnerBadgeProps) {
  if (variant === "artwork") {
    return (
      <span className={`inline-flex items-center ${className}`.trim()}>
        <Image
          src="https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Owners-images/Dummy2.png"
          alt="Founding Owner"
          width={260}
          height={90}
          className="h-auto w-[260px] max-w-full"
          priority={false}
        />
      </span>
    );
  }

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

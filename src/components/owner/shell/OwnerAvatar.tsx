import Image from "next/image";

type OwnerAvatarProps = {
  displayName: string | null;
  avatarUrl: string | null;
  initials: string;
  size?: "sm" | "lg";
};

const sizeClasses = {
  sm: "h-9 w-9 text-[12px]",
  lg: "h-20 w-20 text-xl",
} as const;

export default function OwnerAvatar({ displayName, avatarUrl, initials, size = "sm" }: OwnerAvatarProps) {
  const label = displayName ? `${displayName} profile photo` : "Owner profile photo";

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#D8B451]/20 font-semibold text-[#0F1B33] ring-1 ring-[#D4AF37]/30 ${sizeClasses[size]}`}
      aria-label={avatarUrl ? label : undefined}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt={label} fill sizes={size === "lg" ? "80px" : "36px"} className="object-cover" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}

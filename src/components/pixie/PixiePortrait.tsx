import Image from "next/image";

export default function PixiePortrait({ compact = false }: { compact?: boolean }) {
  const size = compact ? "h-14 w-14" : "h-24 w-24";
  return (
    <div
      className={`${size} relative shrink-0 overflow-hidden rounded-full border border-white bg-[linear-gradient(145deg,#eef3ff,#fff7df)] shadow-[0_14px_34px_rgba(31,41,55,0.16)]`}
      aria-label="Pixie visual companion"
      role="img"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_18%,rgba(255,200,87,0.45),transparent_34%),radial-gradient(circle_at_70%_70%,rgba(46,143,255,0.24),transparent_36%)]" />
      <Image
        src="/images/pixie-logo.png"
        alt=""
        fill
        sizes={compact ? "56px" : "96px"}
        className="object-contain p-3"
        priority={compact}
      />
    </div>
  );
}


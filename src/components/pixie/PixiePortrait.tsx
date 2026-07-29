export default function PixiePortrait({ compact = false }: { compact?: boolean }) {
  const size = compact ? "h-14 w-14" : "h-24 w-24";
  const letterSize = compact ? "text-lg" : "text-4xl";
  return (
    <div
      className={`${size} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-[linear-gradient(145deg,#eef3ff,#fff7df)] shadow-[0_14px_34px_rgba(31,41,55,0.16)]`}
      aria-label="Hara visual companion"
      role="img"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_18%,rgba(255,200,87,0.45),transparent_34%),radial-gradient(circle_at_70%_70%,rgba(46,143,255,0.24),transparent_36%)]" />
      <span className={`relative font-serif ${letterSize} font-medium text-[#13234A]`}>H</span>
    </div>
  );
}

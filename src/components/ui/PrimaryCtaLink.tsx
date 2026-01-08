import Link from "next/link";

type PrimaryCtaLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

const baseClasses =
  "inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/30 hover:bg-white/16";

export default function PrimaryCtaLink({ href, children, className }: PrimaryCtaLinkProps) {
  return (
    <Link href={href} className={className ? `${baseClasses} ${className}` : baseClasses}>
      {children}
    </Link>
  );
}

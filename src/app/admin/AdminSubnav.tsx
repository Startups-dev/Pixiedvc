import Link from 'next/link';

type AdminSubnavProps = {
  current: 'matching' | 'ledger' | 'affiliates' | 'affiliate-applications' | 'platform-tools';
};

const items = [
  { key: 'admin', label: 'Admin', href: '/admin' },
  { key: 'matching', label: 'Matching', href: '/admin/matching' },
  { key: 'affiliates', label: 'Affiliates', href: '/admin/affiliates' },
  { key: 'affiliate-applications', label: 'Affiliate Applications', href: '/admin/affiliates/applications' },
  { key: 'ledger', label: 'Finance Ledger', href: '/admin/reports/ledger' },
  { key: 'platform-tools', label: 'Platform Tools', href: '/admin/platform-tools' },
] as const;

export default function AdminSubnav({ current }: AdminSubnavProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-[#8e8ea0]">
        {items.map((item, index) => {
          const isActive = item.key === current;
          const linkClass = `transition hover:text-[#ececec] ${
            isActive ? 'font-semibold text-[#ececec]' : 'text-[#8e8ea0]'
          }`;
          return (
            <span key={item.key} className="flex items-center gap-2">
              {item.key === 'admin' ? (
                <a href="/admin" className={linkClass}>
                  {item.label}
                </a>
              ) : (
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              )}
              {index < items.length - 1 ? (
                <span className="text-[#5f6368]">→</span>
              ) : null}
            </span>
          );
        })}
      </nav>
      <Link
        href="/admin"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8e8ea0] transition hover:text-[#ececec]"
      >
        Back to Admin
      </Link>
    </div>
  );
}

import Link from 'next/link';

type AdminSubnavProps = {
  current: 'matching' | 'ledger';
};

const items = [
  { key: 'admin', label: 'Admin', href: '/admin' },
  { key: 'matching', label: 'Matching', href: '/admin/matching' },
  { key: 'ledger', label: 'Finance Ledger', href: '/admin/reports/ledger' },
] as const;

export default function AdminSubnav({ current }: AdminSubnavProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        {items.map((item, index) => {
          const isActive = item.key === current;
          return (
            <span key={item.key} className="flex items-center gap-2">
              <Link
                href={item.href}
                className={`transition hover:text-slate-800 ${
                  isActive ? 'font-semibold text-slate-900' : 'text-slate-500'
                }`}
              >
                {item.label}
              </Link>
              {index < items.length - 1 ? (
                <span className="text-slate-300">→</span>
              ) : null}
            </span>
          );
        })}
      </nav>
      <Link
        href="/admin"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-600"
      >
        Back to Admin
      </Link>
    </div>
  );
}
